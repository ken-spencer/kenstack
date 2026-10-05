import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { waitUntil } from "@vercel/functions";
import { eq, getTableName, lt, sql, type Table } from "drizzle-orm";
import { createMimeMessage, Mailbox } from "mimetext";

import { db } from "@app/db";
import { loadEmailFrom } from "@app/email";
import { emailMessages } from "@kenstack/db/tables/emailMessages";
import errorLog from "@kenstack/lib/errorLog";

const ses = new SESClient();

function isRateLimitError(name: string) {
  // SES can return error.name = "Throttling" or "ThrottlingException"
  return [
    "Throttling",
    "ThrottlingException",
    "TooManyRequestsException",
    "TooManyRequests",
  ].includes(name);
}

export interface Attachment {
  /** Whether the attachment should be included inline */
  inline?: boolean;
  /** Filename as it will appear in the email */
  filename: string;
  /** MIME type of the attachment */
  contentType: string;
  /** Raw data (Buffer, Uint8Array, or base64 string) */
  data: string;
  /** Optional additional headers for the attachment */
  headers?: Record<string, string>;
}

export type EmailAddress = string | { name: string; addr: string };

// The error reporter's alerts, which the Email Log leaves out.
export const errorReportKind = "errorReport";

type MailMessage = {
  to: string;
  cc?: string;
  bcc?: string;
  // The site's sender from @app/email when omitted.
  from?: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  html: string;
  attachments?: Attachment[];
};

type MailerOptions = MailMessage & {
  // What the email is, in camel case, recorded in the Email Log: the operation's quota or reCAPTCHA
  // key where it has one, such as `contact` or `verification`, otherwise a name such as `receipt`.
  kind: string;
} & (
    | {
        // The site record the email is about, such as an order, which the Email Log links to.
        table: Table;
        rowId: number;
      }
    | { table?: undefined; rowId?: undefined }
  );

export type MailDeliveryResult =
  | { messageId: string; status: "sent" }
  | { status: "recipient-rejected" }
  | {
      attempts: number;
      code: string;
      httpStatusCode?: number;
      status: "operational-failure";
    };

function errorName(err: unknown) {
  return typeof err === "object" &&
    err !== null &&
    "name" in err &&
    typeof err.name === "string"
    ? err.name
    : "UnknownError";
}

function isRecipientRejection(err: unknown, recipient: string) {
  if (errorName(err) !== "InvalidParameterValue") {
    return false;
  }

  const message =
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof err.message === "string"
      ? err.message.toLowerCase()
      : "";
  const normalizedRecipient = recipient.trim().toLowerCase();

  return (
    normalizedRecipient.length > 0 && message.includes(normalizedRecipient)
  );
}

function operationalFailure(
  err: unknown,
  attempts: number,
): MailDeliveryResult {
  const httpStatusCode =
    typeof err === "object" &&
    err !== null &&
    "$metadata" in err &&
    typeof err.$metadata === "object" &&
    err.$metadata !== null &&
    "httpStatusCode" in err.$metadata &&
    typeof err.$metadata.httpStatusCode === "number"
      ? err.$metadata.httpStatusCode
      : undefined;

  return {
    attempts,
    code: errorName(err),
    ...(httpStatusCode === undefined ? {} : { httpStatusCode }),
    status: "operational-failure",
  };
}

async function logOperationalFailure(
  delivery: Extract<MailDeliveryResult, { status: "operational-failure" }>,
) {
  try {
    // Mail delivery cannot use reportError because that reporter sends alerts by email.
    const httpStatus =
      delivery.httpStatusCode === undefined
        ? ""
        : `; HTTP ${delivery.httpStatusCode}`;
    await errorLog({
      name: "ses-email-delivery-failed",
      message: `SES email delivery failed (${delivery.code}${httpStatus}) after ${delivery.attempts} attempt${delivery.attempts === 1 ? "" : "s"}.`,
      context: {
        attempts: delivery.attempts,
        code: delivery.code,
        ...(delivery.httpStatusCode === undefined
          ? {}
          : { httpStatusCode: delivery.httpStatusCode }),
      },
    });
  } catch (error) {
    // This fallback must not enter the email-backed operational reporter.
    // eslint-disable-next-line no-console
    console.error("[kenstack:mailer] Email delivery failure logging failed.", {
      code: delivery.code,
      errorName: errorName(error),
    });
  }
}

async function sendEmail({
  to,
  cc,
  bcc,
  from,
  replyTo,
  subject = "",
  html = "",
  attachments = [],
}: MailMessage & { from: EmailAddress }): Promise<MailDeliveryResult> {
  const msg = createMimeMessage();
  msg.setSender(from);

  if (replyTo) {
    msg.setHeader("Reply-To", new Mailbox(replyTo));
  }

  msg.setTo(to);

  if (cc) {
    msg.setCc(cc);
  }

  if (bcc) {
    msg.setBcc(bcc);
  }

  msg.setSubject(subject);

  msg.addMessage({
    contentType: "text/html",
    data: html,
  });

  attachments.forEach(
    ({ inline = false, filename, contentType, data, headers }) => {
      msg.addAttachment({
        inline,
        filename,
        contentType,
        data,
        headers,
      });
    },
  );

  const raw = msg.asRaw();
  const buffer = Buffer.from(raw, "utf8");
  const cmd = new SendRawEmailCommand({ RawMessage: { Data: buffer } });

  const maxRetries = 3;
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await ses.send(cmd);
      if (!result.MessageId) {
        return {
          attempts: attempt,
          code: "MissingMessageId",
          status: "operational-failure",
        };
      }
      return { messageId: result.MessageId, status: "sent" };
    } catch (err) {
      if (isRecipientRejection(err, to)) {
        return { status: "recipient-rejected" };
      }

      if (!isRateLimitError(errorName(err)) || attempt === maxRetries) {
        return operationalFailure(err, attempt);
      }

      await new Promise((res) => setTimeout(res, 1000));
    }
  }
}

// Delivery failures stay out of reportError, so a missing or failed sender lookup is logged here. A
// caller that loads the sender early, such as to refuse up front, passes it on as `from`, so it is
// logged once.
export async function loadSiteSender() {
  let sender;
  let error;
  try {
    sender = await loadEmailFrom();
  } catch (lookupError) {
    error = lookupError;
  }

  if (!sender) {
    try {
      await errorLog({
        error,
        message: error
          ? "Email was not sent: loading the site's sender with loadEmailFrom() from @app/email failed."
          : "Email was not sent: loadEmailFrom() from @app/email gave no sender address. Configure the site's sender.",
        name: "email-sender-unavailable",
      });
    } catch {
      // eslint-disable-next-line no-console
      console.error("[kenstack:mailer] Email sender is unavailable.");
    }
  }

  return sender;
}

// What a form shows when the site's sender is missing, naming the email it couldn't send.
export function senderUnavailableMessage(email: string) {
  return `We couldn’t send ${email} because this site’s email sender isn’t set up.`;
}

export default async function mailer({
  from,
  kind,
  table,
  rowId,
  ...options
}: MailerOptions) {
  const sender = from ?? (await loadSiteSender());
  if (!sender) {
    return {
      attempts: 0,
      code: "SenderUnavailable",
      status: "operational-failure",
    } satisfies MailDeliveryResult;
  }

  // Logged before SES is contacted, so every send has a row; one still `sending` afterwards is a send
  // whose outcome is unknown. Without its row, the email is not sent. Error reports stay out of the
  // log, which staff read: they carry the monitoring address and the exception.
  let emailMessageId: number | undefined;
  if (kind !== errorReportKind) {
    try {
      [{ id: emailMessageId }] = await db
        .insert(emailMessages)
        .values({
          to: options.to.toLowerCase(),
          from:
            typeof sender === "string"
              ? sender
              : `${sender.name} <${sender.addr}>`,
          subject: options.subject,
          kind,
          status: "sending",
          table: table && getTableName(table),
          rowId,
        })
        .returning({ id: emailMessages.id });
    } catch (error) {
      await logMailError(
        "email-log-unavailable",
        "Email was not sent: its Email Log row could not be written.",
        error,
      );
      return operationalFailure(error, 0);
    }
  }

  // Serverless has no cleanup timer; a small sample of sends prunes rows past retention. The catch
  // starts the query, which waitUntil alone does not, and outside Vercel waitUntil does nothing.
  if (Math.random() < 0.01) {
    waitUntil(
      db
        .delete(emailMessages)
        .where(lt(emailMessages.createdAt, sql`now() - interval '13 months'`))
        .catch((error) =>
          logMailError(
            "email-log-prune-failed",
            "Old Email Log rows could not be pruned.",
            error,
          ),
        ),
    );
  }

  let delivery: MailDeliveryResult;
  try {
    delivery = await sendEmail({ ...options, from: sender });
  } catch (error) {
    delivery = operationalFailure(error, 0);
  }

  if (delivery.status === "operational-failure") {
    await logOperationalFailure(delivery);
  }

  // The SDK retries a send after a reset, a timeout, a throttle or a server error, and the mailer
  // retries throttles, so one row can stand for a retried send. Only SES's acceptance, its refusal (a
  // 4xx other than a throttle), or a failure before anything was sent settles the row. A final throttle
  // can follow an earlier request SES accepted but whose reply was lost, and after a dropped
  // connection, a reply without an id, a success reply whose body was lost, or a final server error,
  // SES may also have accepted the email, so the row stays `sending` and the Email Log shows it as not
  // confirmed.
  const isSettled =
    delivery.status !== "operational-failure" ||
    (delivery.httpStatusCode !== undefined &&
      delivery.httpStatusCode >= 400 &&
      delivery.httpStatusCode < 500 &&
      !isRateLimitError(delivery.code)) ||
    delivery.attempts === 0;
  if (emailMessageId !== undefined && isSettled) {
    try {
      await db
        .update(emailMessages)
        .set(
          delivery.status === "sent"
            ? {
                status: "sent",
                sesMessageId: delivery.messageId,
                sentAt: new Date(),
              }
            : {
                status: "failed",
                error:
                  delivery.status === "recipient-rejected"
                    ? "Recipient rejected"
                    : delivery.code,
              },
        )
        .where(eq(emailMessages.id, emailMessageId));
    } catch (error) {
      await logMailError(
        "email-log-update-failed",
        "An email's outcome could not be recorded in the Email Log.",
        error,
      );
    }
  }

  return delivery;
}

// Mail problems stay out of reportError, which sends alerts by email.
async function logMailError(name: string, message: string, error: unknown) {
  try {
    await errorLog({ error, message, name });
  } catch {
    // eslint-disable-next-line no-console
    console.error(`[kenstack:mailer] ${message}`);
  }
}

import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { createMimeMessage, Mailbox } from "mimetext";
import errorLog from "@kenstack/lib/errorLog";

const ses = new SESClient();

function isRateLimitError(err: unknown) {
  if (typeof err !== "object" || err === null || !("name" in err)) {
    return false;
  }

  // SES can return error.name = "Throttling" or "ThrottlingException"
  return (
    err.name === "Throttling" ||
    err.name === "ThrottlingException" ||
    err.name === "TooManyRequestsException" ||
    err.name === "TooManyRequests"
  );
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

type EmailAddress = string | { name: string; addr: string };

interface Options {
  to: string;
  cc?: string;
  bcc?: string;
  from: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  html: string;
  attachments?: Attachment[];
}

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
    // Mail delivery cannot use deps.error because that reporter sends alerts by email.
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
}: Options): Promise<MailDeliveryResult> {
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
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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

      if (!isRateLimitError(err)) {
        return operationalFailure(err, attempt);
      }

      if (attempt === maxRetries) {
        return operationalFailure(err, attempt);
      }

      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  return {
    attempts: maxRetries,
    code: "RetryLoopEnded",
    status: "operational-failure",
  };
}

export default async function mailer(options: Options) {
  let delivery: MailDeliveryResult;
  try {
    delivery = await sendEmail(options);
  } catch (error) {
    delivery = operationalFailure(error, 0);
  }

  if (delivery.status === "operational-failure") {
    await logOperationalFailure(delivery);
  }

  return delivery;
}

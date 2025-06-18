import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { createMimeMessage } from "mimetext";

const ses = new SESClient();

function isRateLimitError(err) {
  // SES can return error.name = "Throttling" or "ThrottlingException"
  return (
    err.name === "Throttling" ||
    err.name === "ThrottlingException" ||
    err.name === "TooManyRequestsException" ||
    err.name === "TooManyRequests"
  );
}

export default async function rawMailer({
  to,
  cc,
  bcc,
  from = { name: "Do Not Reply", addr: "do.not.reply@thaumazo.org" },
  subject = "",
  html = "",
  attachments = [],
}) {
  const msg = createMimeMessage();
  msg.setSender(from);

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
      return await ses.send(cmd);
    } catch (err) {
      if (!isRateLimitError(err)) {
        // eslint-disable-next-line no-console
        console.error("There was a problem sending email to", to, "\n", err);
        return false;
      }

      if (attempt === maxRetries) {
        // eslint-disable-next-line no-console
        console.error(
          `Exceeded ${maxRetries} rate-limit retries. Giving up.`,
          err,
        );
      } else {
        // eslint-disable-next-line no-console
        console.error(`SES Rate limit hit (attempt ${attempt}):`, err);
      }

      await new Promise((res) => setTimeout(res, 1000));
    }
  }
}

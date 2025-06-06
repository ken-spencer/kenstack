import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { createMimeMessage } from "mimetext";

const ses = new SESClient();

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

  attachments?.forEach(
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

  const raw = msg.asRaw(); // produces a multipart/related envelope
  const buffer = Buffer.from(raw, "utf8");

  const cmd = new SendRawEmailCommand({
    RawMessage: { Data: buffer },
  });
  try {
    await ses.send(cmd);
    // const { MessageId } = await ses.send(cmd);
    // console.log("Email sent, Message ID:", MessageId);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to send email:", e);
  }
}

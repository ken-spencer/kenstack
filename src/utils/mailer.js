import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import errorLog from "../log/error";

const client = new SESClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: "us-east-1",
});

export default async function SESmailer({
  to = [],
  cc = [],
  from = "",
  subject = "",
  html = "",
  text = "",
}) {
  var params = {
    Destination: {
      ToAddresses: to,
      CcAddresses: cc,
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: html,
        },
        Text: {
          Charset: "UTF-8",
          Data: text,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: from,
    ReplyToAddresses: [from],
  };

  let command;
  try {
    command = new SendEmailCommand(params);
  } catch (e) {
    errorLog(e, "There was a problem generating the email command");
    return false;
  }

  const data = await client.send(command);
  return data;
}

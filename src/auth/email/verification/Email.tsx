import "server-only";

import { Button, Heading, Hr, render, Section, Text } from "react-email";
import { EmailContainer } from "@app/email";

import type { CreateVerificationEmail } from "./sendCode";

export type VerificationEmailCopy = {
  actionLabel: string;
  heading: string;
  introduction: string;
  subject: string;
};

export function createVerificationEmail(
  copy: VerificationEmailCopy,
): CreateVerificationEmail {
  return async ({ code, expiresInMinutes, url }) => ({
    html: await render(
      <EmailContainer>
        <Heading
          style={{
            color: "#000000",
            fontSize: "24px",
            fontWeight: "normal",
            margin: "30px 0",
            padding: "0",
            textAlign: "center",
          }}
        >
          {copy.heading}
        </Heading>
        <Text
          style={{ color: "#000000", fontSize: "14px", lineHeight: "24px" }}
        >
          {copy.introduction}
        </Text>
        <Text
          style={{
            color: "#666666",
            fontSize: "13px",
            lineHeight: "22px",
            textAlign: "center",
          }}
        >
          This link expires in {expiresInMinutes}{" "}
          {expiresInMinutes === 1 ? "minute" : "minutes"}.
        </Text>
        <Section
          style={{
            marginBottom: "32px",
            marginTop: "32px",
            textAlign: "center",
          }}
        >
          <Button
            href={url}
            style={{
              backgroundColor: "#111111",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "bold",
              padding: "12px 22px",
              textDecoration: "none",
            }}
          >
            {copy.actionLabel}
          </Button>
        </Section>
        <Text
          style={{
            color: "#000000",
            fontSize: "14px",
            lineHeight: "24px",
            textAlign: "center",
          }}
        >
          Or enter this six-digit code
        </Text>
        <Text
          style={{
            color: "#000000",
            fontSize: "28px",
            fontWeight: "bold",
            letterSpacing: "8px",
            lineHeight: "36px",
            textAlign: "center",
          }}
        >
          {code}
        </Text>
        <Hr style={{ borderColor: "#e5e5e5", margin: "26px 0" }} />
        <Text
          style={{ color: "#666666", fontSize: "12px", lineHeight: "20px" }}
        >
          If you did not request this email, you can ignore it.
        </Text>
      </EmailContainer>,
    ),
    subject: copy.subject,
  });
}

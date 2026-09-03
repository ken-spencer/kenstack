import { Button, Heading, Hr, Section, Text } from "react-email";

import { EmailContainer, attachments } from "@app/email";

export { attachments };

type OnboardingEmailProps =
  | { preview: true; invitedBy?: string; name?: string; url?: string }
  | { preview?: false; invitedBy: string; name: string; url: string };

export default function OnboardingEmail({
  invitedBy = "An administrator",
  name = "there",
  preview = false,
  url = "#",
}: OnboardingEmailProps) {
  return (
    <EmailContainer preview={preview}>
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
        Your account is ready
      </Heading>
      <Text style={{ color: "#000000", fontSize: "14px", lineHeight: "24px" }}>
        Hello {name},
      </Text>
      <Text style={{ color: "#000000", fontSize: "14px", lineHeight: "24px" }}>
        {invitedBy} created an account for you. Open the login page when you’re
        ready to sign in.
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
            backgroundColor: "#1D4ED8",
            borderRadius: "4px",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "bold",
            padding: "10px 20px",
            textDecoration: "none",
          }}
        >
          Go to login
        </Button>
      </Section>
      <Text style={{ color: "#000000", fontSize: "14px", lineHeight: "24px" }}>
        Your email address will be filled in. Select Email me a code to receive
        a fresh sign-in email. This link does not expire and does not sign you
        in.
      </Text>
      <Hr
        style={{
          border: "1px solid #eaeaea",
          margin: "26px 0",
          width: "100%",
        }}
      />
      <Text style={{ color: "#666666", fontSize: "12px", lineHeight: "24px" }}>
        If you were not expecting this email, you can ignore it.
      </Text>
    </EmailContainer>
  );
}

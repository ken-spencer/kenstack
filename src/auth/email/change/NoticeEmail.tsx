import { Button, Heading, Hr, Section, Text } from "react-email";
import { EmailContainer } from "@app/email";

// Sent to the address being replaced when a sign-in email change is requested.
export default function NoticeEmail({
  cancelUrl,
  newEmail,
}: {
  cancelUrl: string;
  newEmail: string;
}) {
  return (
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
        Your sign-in email is being changed
      </Heading>
      <Text style={{ color: "#000000", fontSize: "14px", lineHeight: "24px" }}>
        Someone asked to change your sign-in email to{" "}
        <strong>{newEmail}</strong>. If that was you, finish with the code we
        sent to that address.
      </Text>
      <Section
        style={{
          marginBottom: "32px",
          marginTop: "32px",
          textAlign: "center",
        }}
      >
        <Button
          href={cancelUrl}
          style={{
            backgroundColor: "#111111",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "bold",
            padding: "12px 22px",
            textDecoration: "none",
          }}
        >
          This wasn’t me
        </Button>
      </Section>
      <Hr style={{ borderColor: "#e5e5e5", margin: "26px 0" }} />
      <Text style={{ color: "#666666", fontSize: "12px", lineHeight: "20px" }}>
        This button stops the change if it has not been confirmed yet.
      </Text>
    </EmailContainer>
  );
}

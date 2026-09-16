import { Button, Heading, Hr, Section, Text } from "react-email";
import { EmailContainer } from "@app/email";

// Sent instead of a confirmation code when the requested address already has
// its own account. The requester's screen looks the same either way.
export default function ExistingAccountEmail({
  loginUrl,
}: {
  loginUrl: string;
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
        This email already has an account
      </Heading>
      <Text style={{ color: "#000000", fontSize: "14px", lineHeight: "24px" }}>
        Someone tried to use this address as the sign-in email for a different
        account. It already belongs to this account, so nothing changed. If that
        was you, sign in here.
      </Text>
      <Section
        style={{
          marginBottom: "32px",
          marginTop: "32px",
          textAlign: "center",
        }}
      >
        <Button
          href={loginUrl}
          style={{
            backgroundColor: "#111111",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "bold",
            padding: "12px 22px",
            textDecoration: "none",
          }}
        >
          Sign in
        </Button>
      </Section>
      <Hr style={{ borderColor: "#e5e5e5", margin: "26px 0" }} />
      <Text style={{ color: "#666666", fontSize: "12px", lineHeight: "20px" }}>
        If this wasn’t you, you can ignore this email.
      </Text>
    </EmailContainer>
  );
}

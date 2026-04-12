import { Button, Heading, Hr, Section, Text } from "@react-email/components";

import { deps } from "@app/deps";

import { type Geo } from "@vercel/functions";

const {
  email: { EmailCont, attachments },
} = deps;
export { attachments };

export type ForgotPasswordEmailProps =
  | {
      preview: true;
      name?: string;
      url?: string;
      admin?: boolean;
      ip?: string;
      geo?: Geo;
    }
  | {
      preview?: false;
      name: string;
      url: string;
      admin?: boolean;
      ip: string;
      geo: Geo;
    };

export default function ForgotPasswordEmail({
  name = "Your name",
  url = "#",
  admin = false, // sent by administrator
  geo = {},
  ip = "unknown",
  preview = false,
}: ForgotPasswordEmailProps) {
  const { city, region, country } = geo;
  let location = city;

  if (region) {
    location += (location ? ", " : "") + region;
  }

  if (country) {
    location += (location ? " " : "") + country;
  }

  return (
    <EmailCont preview={preview}>
      <Heading
        style={{
          color: "#000000",
          fontSize: "24px",
          fontWeight: "normal",
          textAlign: "center",
          padding: "0",
          margin: "30px 0",
        }}
      >
        Reset your password
      </Heading>
      <Text style={{ color: "#000000", fontSize: "14px", lineHeight: "24px" }}>
        Hello {name},
      </Text>
      <Text
        style={{
          whiteSpace: "pre-wrap",
          color: "#000000",
          fontSize: "14px",
          lineHeight: "24px",
        }}
      >
        We received a request to reset the password for your account associated
        with this email address. If you are expecting this request, please click
        on the link below to reset your password:
      </Text>
      <Section
        style={{
          textAlign: "center",
          marginTop: "32px",
          marginBottom: "32px",
        }}
      >
        <Button
          style={{
            padding: "10px 20px",
            backgroundColor: "#1D4ED8",
            borderRadius: "4px",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "bold",
            textDecoration: "none",
            textAlign: "center",
          }}
          href={url}
        >
          Reset your password
        </Button>
      </Section>
      <Text
        style={{
          whiteSpace: "pre-wrap",
          color: "#000000",
          fontSize: "14px",
          lineHeight: "24px",
        }}
      >
        This link will remain active for 15 minutes.{" "}
      </Text>
      {admin ? null : (
        <>
          <Hr
            style={{
              border: "1px solid #eaeaea",
              margin: "26px 0",
              width: "100%",
            }}
          />
          <Text
            style={{
              color: "#666666",
              fontSize: "12px",
              lineHeight: "24px",
            }}
          >
            This email was intended for{" "}
            <span style={{ color: "#000000" }}>{name} </span>. It was requested
            from <span style={{ color: "#000000" }}>{ip}</span>
            {location && (
              <>
                located in <span style={{ color: "#000000" }}>{location}</span>
              </>
            )}
            . If you were not expecting this email, you can ignore it. If you
            are concerned about your account{"'"}s safety, please reply to this
            email to get in touch with us.
          </Text>
        </>
      )}
    </EmailCont>
  );
}

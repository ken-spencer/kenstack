/* Runtime-safe @app/email fallback for standalone Kenstack tooling and tests. */

import { Body, Container, Head, Html } from "react-email";

import type { EmailContainer as EmailContainerType } from "@kenstack/auth/email/types";

export const EmailContainer: EmailContainerType = ({ children }) => (
  <Html>
    <Head>
      <meta name="color-scheme" content="light" />
      <meta name="supported-color-schemes" content="light" />
    </Head>
    <Body
      style={{
        margin: 0,
        padding: 0,
        backgroundColor: "#ffffff",
        fontFamily: "verdana, sans-serif",
      }}
    >
      <Container
        style={{
          border: "1px solid #eaeaea",
          borderRadius: "4px",
          margin: "40px auto auto",
          padding: "20px",
          width: "465px",
        }}
      >
        {children}
      </Container>
    </Body>
  </Html>
);

export const attachments = [];

export async function loadEmailFrom() {
  return process.env.FROM_ADDRESS;
}

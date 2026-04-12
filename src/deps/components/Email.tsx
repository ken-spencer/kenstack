import { Html, Head, Body, Container } from "@react-email/components";

const EmailCont = ({
  children,
  // preview = false,
}: {
  children: React.ReactNode;
  preview?: boolean;
}) => (
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

export default EmailCont;

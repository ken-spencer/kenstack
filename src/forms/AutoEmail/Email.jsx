import { Html } from "@react-email/html";

import {
  Body,
  Container,
  // Heading,
  // Text,
} from "@react-email/components";

import Auto from "./Auto";

export default function Email({ fields, values }) {
  return (
    <Html lang="en">
      <Body
        style={{
          fontFamily: "sans-serif",
          backgroundColor: "white",
          margin: "auto",
        }}
      >
        <Container
          style={{
            border: "1px solid #eaeaea",
            borderRadius: "4px",
            marginTop: "40px",
            marginBottom: "40px",
            marginLeft: "auto",
            marginRight: "auto",
            padding: "20px",
            width: "465px",
          }}
        >
          <Auto fields={fields} values={values} />
        </Container>
      </Body>
    </Html>
  );
}

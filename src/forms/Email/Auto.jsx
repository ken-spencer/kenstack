import React from "react";
import sentenceCase from "@kenstack/utils/sentenceCase";

import { Section, Row, Column } from "@react-email/components";

import Field from "./Field";

export default function Auto({ fields, formData }) {
  return (
    <Section>
      {Object.entries(fields).map(([key, field]) => {
        const label = field.label || sentenceCase(key);

        if (field.fields) {
          return (
            <Section
              key={key}
              style={{
                border: "1px solid #eaeaea",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  padding: "8px",
                  background: "rgba(128, 128, 128, .2)",
                  borderBottom: "1px solid #eaeaea",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                {label}
              </div>
              <div style={{ padding: "8px" }}>
                <Auto fields={field.fields} formData={formData} />
              </div>
            </Section>
          );
        }

        return (
          <React.Fragment key={key}>
            <Row style={{ paddingTop: "10px" }}>
              <Column style={{ fontSize: "18px", fontWeight: "500" }}>
                {label}
              </Column>
            </Row>
            <Row>
              <Column>
                <Field name={key} {...field} formData={formData} />
              </Column>
            </Row>
          </React.Fragment>
        );
      })}
    </Section>
  );
}

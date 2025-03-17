import React from "react";
import sentenceCase from "@kenstack/utils/sentenceCase";

import { Section, Row, Column } from "@react-email/components";

import Field from "./Field";

export default function Auto({ fields, values }) {
  return (
    <Section>
      {Object.entries(fields).map(([key, field]) => {
        const label = field.label || sentenceCase(key);

        /*
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
                  paddingTop: "8px",
                  background: "rgba(128, 128, 128, .2)",
                  borderBottom: "1px solid #eaeaea",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                {label}
              </div>
              <div style={{ padding: "8px" }}>
                <Auto fields={field.fields} values={values} />
              </div>
            </Section>
          );
        }
        */

        return (
          <Row style={{ paddingBottom: "12px" }} key={key}>
            <Column>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                {label}
              </div>
              <Field name={key} {...field} values={values} />
            </Column>
          </Row>
        );
      })}
    </Section>
  );
}

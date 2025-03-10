import { Row, Column } from "@react-email/components";

export default function Radio({ name, options = [], formData }) {
  const value = formData.get(name);

  if (!value) {
    return "-";
  }

  return (
    <>
      {options
        .map(([key, label]) => {
          if (key !== value) {
            return false;
          }

          return (
            <Row key={key}>
              <Column style={{ fontSize: "16px" }}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "24px",
                    paddingRight: "10px",
                    verticalAlign: "middle",
                  }}
                >
                  {"\u25C9"}
                </span>
                {label}
              </Column>
            </Row>
          );
        })
        .filter(Boolean)}
    </>
  );
}

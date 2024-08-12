import { Row, Column } from "@react-email/components";

export default function CheckboxList({ name, options = [], formData }) {
  const values = formData.getAll(name);

  if (values.length === 0) {
    return "-";
  }

  return (
    <>
      {options
        .map(([key, label]) => {
          if (!values.includes(key)) {
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
                  {"\u2611"}
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

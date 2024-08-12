// import { } from '@react-email/components';

import Radio from "./Radio";
import CheckboxList from "./CheckboxList";

export default function Field(props) {
  const { name, field = "input", formData, options = [] } = props;

  if (typeof field === "function" || typeof field === "object") {
    return (
      <Text>{formData.get(name) ? formData.getAll().join("\n") : "-"}</Text>
    );
  }

  switch (field.toLowerCase()) {
    default:
      return <Text>{formData.get(name) || "-"}</Text>;
    case "password":
      return <Text>{formData.get(name) ? "* * * * * * * *" : "-"}</Text>;
    case "checkbox":
      return (
        <span style={{ display: "inline-block", fontSize: "24px" }}>
          {formData.get(name) ? "\u2611" : "\u2610"}
        </span>
      );
    case "select": {
      const option = options.reduce((acc, [key, value]) => {
        if (formData.get(name) === key) {
          acc = value;
        }
        return acc;
      }, "");
      return <Text>{option || formData.get(name) || "-"}</Text>;
    }
    case "checkboxlist":
      return <CheckboxList {...props} />;
    case "radio":
      return <Radio {...props} />;
  }
}

function Text({ children }) {
  return (
    <div
      style={{ whiteSpace: "pre-line", textAlign: "left", fontSize: "16px" }}
    >
      {children}
    </div>
  );
}

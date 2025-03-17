// import { } from '@react-email/components';

import Radio from "./Radio";
import CheckboxList from "./CheckboxList";

export default function Field(props) {
  const { name, field = "input", values, options = [] } = props;
  const value = values[name] || "";

  if (typeof field === "function" || typeof field === "object") {
    return <Text>{value}</Text>;
  }

  switch (field.toLowerCase()) {
    default:
      return (
        <Text>
          <pre style={{ padding: 0, margin: 0, whiteSpace: "pre-wrap" }}>
            {value || "-"}
          </pre>
        </Text>
      );
    case "password":
      return <Text>{value ? "* * * * * * * *" : "-"}</Text>;
    case "checkbox":
      return (
        <span style={{ display: "inline-block", fontSize: "24px" }}>
          {value ? "\u2611" : "\u2610"}
        </span>
      );
    case "select": {
      const option = options.reduce((acc, [key, optione]) => {
        if (value === key) {
          acc = option;
        }
        return acc;
      }, "");
      return <Text>{option || value || "-"}</Text>;
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

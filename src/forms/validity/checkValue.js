import normalize from "./normalize";
import isEmail from "validator/es/lib/isEmail";

import GlobalFormState from "../lib/GlobalFormState";

export default function checkValue(name, props, values) {
  const rules = normalize(props);
  const value = getValue(values, name);
  const valueStr = String(value || "");

  if (rules.required && valueStr.length === 0) {
    return rules.required.message;
  }

  if (rules.email && !isEmail(value)) {
    return rules.email.message;
  }

  if (rules.pattern) {
    let { pattern, message } = rules.pattern;
    let regex = new RegExp(`^${pattern}$`);

    if (!regex.test(value)) {
      return message;
    }
  }

  if (rules.matches) {
    const matchValue = getValue(values, rules.matches.field);

    let matchField;
    if (values instanceof GlobalFormState) {
      matchField = values.fields.get(rules.matches.field);
    }

    if (value !== matchValue) {
      if (matchField) {
        matchField.matchField = values.fields.get(name);
      }
      return rules.matches.message;
    } else if (matchField) {
      delete matchField.matchField;
    }
  }
}

function getValue(data, name) {
  if (data instanceof FormData) {
    return data.get(name);
  } else if (data instanceof GlobalFormState) {
    return data.fields.get(name)?.value;
  } else {
    return data[name];
  }
}

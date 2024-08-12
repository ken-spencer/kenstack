// import pick from "lodash/pick";

const props = ["required", "email", "unique", "pattern", "matches"];

const cache = new WeakMap();

export default function normalize(info) {
  if (cache.has(info)) {
    return cache.get(info);
  }
  let rules = {};

  for (let key of props) {
    let value = info[key];
    if (value === true) {
      rules[key] = {};
    } else if (typeof value === "string") {
      switch (key) {
        default:
          rules[key] = { message: value };
          break;
        case "pattern":
          rules[key] = { pattern: value };
          break;
        case "matches":
          rules[key] = { field: value };
          break;
      }
    } else if (typeof value === "object") {
      rules[key] = value;
    }
  }

  if (rules.required) {
    rules.required = {
      message: "This field is required",
      ...rules.required,
    };
  }

  if (info.type === "email" && !rules.email) {
    rules.email = {};
  }

  if (rules.email) {
    rules.email = {
      message: "Please enter a valid email address",
      ...rules.email,
    };
  }

  if (rules.unique) {
    rules.unique = {
      message: "A record with this value already exists",
      ...rules.unique,
    };
  }

  if (rules.pattern) {
    rules.pattern = {
      message: "This field does not match the specified pattern",
      ...rules.pattern,
    };
  } else if (
    (info.type === "password" || info.field === "password") &&
    !info.matches
  ) {
    rules.pattern = {
      pattern: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[\\S]{8,}",
      message:
        "Must be at least 8 characters; include both big and small letters and a number.",
      ...(rules.pattern || {}),
    };
  }

  if (rules.matches) {
    let message;
    if (info.type === "password" || info.field === "password") {
      message = "The passwords you entered don't match.";
    } else {
      message = "This field must match: " + rules.matches.field;
    }

    rules.matches = {
      message,
      ...rules.matches,
    };
  }

  // const retval = pick(rules, props);
  cache.set(info, rules);
  return rules;
}

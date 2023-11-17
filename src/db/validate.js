import isEmail from "validator/es/lib/isEmail";
import errorLog from "../log/error";

const mask = {
  required: false,
  email: false,
  unique: false,
};

export default async function validate(doc, ruleData) {
  const errors = {};
  let hasErrors = false;
  for (const [name, rulesInit] of Object.entries(ruleData)) {
    let rules;
    const info = doc.schema.path(name)?.options || {};

    let defaults = {
      ...mask,
      required: info.required || false,
      unique: info.unique || false,
    };

    if (typeof rulesInit === "string") {
      rules = { ...defaults, [rulesInit]: true };
    } else {
      rules = { ...defaults, ...rulesInit };
    }

    const error = await checkValidity(doc, name, rules);
    if (error) {
      hasErrors = true;
      errors[name] = error;
    }
  }

  if (hasErrors) {
    return errors;
  }

  return false;
}

async function checkValidity(doc, name, rules) {
  const value = doc[name];
  const valueStr = String(value);

  if (rules.required && valueStr.length === 0) {
    return typeof rules.required === "string"
      ? rules.required
      : "This field is required";
  }

  if (rules.email && !isEmail(valueStr)) {
    return typeof rules.email === "string"
      ? rules.email
      : "Please enter a valid email address";
  }

  if (rules.unique) {
    const modelName = doc.constructor.modelName;
    const model = doc.model(modelName);

    let duplicate;
    try {
      duplicate = await model.findOne({
        _id: { $ne: doc._id },
        [name]: value,
      });
    } catch (e) {
      errorLog(e, "Problem querying for duplicates");
      return "There was an unexpected validation problem. Please try again later";
    }

    if (duplicate) {
      return typeof rules.unique == "string"
        ? rules.unique
        : "A record with this value already exists";
    }
  }
}

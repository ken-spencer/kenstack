import checkValue from "./checkValue";

export default function checkValidity(form, field, props) {
  const message = props.message || null;

  const checkMessage = checkValue(field.name, props, form);
  if (checkMessage) {
    // input.setCustomValidity(checkMessage);
    return message || checkMessage;
  } else {
    // input.setCustomValidity("");
  }

  const input = field.ref.current;
  if (!input) {
    return;
  }

  const { validity } = input;

  if (validity.valid) {
    return null;
  }

  if (message) {
    return message;
  }

  // required field
  if (validity.valueMissing) {
    return "This field is required";
  }

  if (validity.typeMismatch) {
    switch (input.type) {
      case "email":
        return "Please enter a valid email address";
      default:
        return input.validationMessage;
    }
  }

  // pattern
  if (validity.patternMismatch) {
    return input.validationMessage;
  }

  if (validity.badInput) {
    return input.validationMessage;
  }

  if (validity.customError) {
    return input.validationMessage;
  }

  if (validity.rangeOverflow) {
    return input.validationMessage;
  }

  if (validity.rangeUnderflow) {
    return input.validationMessage;
  }

  if (validity.stepMismatch) {
    return input.validationMessage;
  }

  if (validity.tooLong) {
    return input.validationMessage;
  }

  if (validity.tooShort) {
    return input.validationMessage;
  }

  // return "Invalid"
  return null;
}

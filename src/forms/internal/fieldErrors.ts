import { isRecord } from "@kenstack/lib/isRecord";

export type FormFieldError = {
  message: string;
  name: string;
};

export const formErrorName = "__kenstack_form_error__";

export function moveRootFormError(errors: Record<string, unknown>) {
  if (!Object.hasOwn(errors, "root")) {
    return errors;
  }

  const { root, ...fieldErrors } = errors;
  return { ...fieldErrors, [formErrorName]: root };
}

function isMessage(value: unknown): value is string | string[] {
  return (
    typeof value === "string" ||
    (Array.isArray(value) &&
      value.every((message) => typeof message === "string"))
  );
}

function isFieldErrorMetadata(name: string, value: unknown) {
  if (name === "message") {
    return isMessage(value);
  }

  if (name === "type") {
    return typeof value === "string" || typeof value === "number";
  }

  if (name === "types" && isRecord(value)) {
    return Object.values(value).every(
      (result) =>
        result === undefined ||
        typeof result === "boolean" ||
        isMessage(result),
    );
  }

  return (
    name === "ref" &&
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string"
  );
}

export function getFormFieldErrors(errors: unknown) {
  const flattened: FormFieldError[] = [];
  const visited = new WeakSet<object>();

  const visit = (value: unknown, path: string[]) => {
    if ((!isRecord(value) && !Array.isArray(value)) || visited.has(value)) {
      return;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, [...path, `${index}`]));
      return;
    }

    const primaryMessages = isMessage(value.message)
      ? typeof value.message === "string"
        ? [value.message]
        : [...value.message]
      : [];
    const typeMessages: string[] = [];
    if (isRecord(value.types)) {
      for (const result of Object.values(value.types)) {
        if (typeof result === "string") {
          typeMessages.push(result);
        } else if (Array.isArray(result)) {
          typeMessages.push(
            ...result.filter((message) => typeof message === "string"),
          );
        }
      }
    }
    const messages = typeMessages.length ? typeMessages : primaryMessages;

    [...new Set(messages)].forEach((message) => {
      flattened.push({ message, name: path.join(".") });
    });

    Object.entries(value).forEach(([name, child]) => {
      if (!isFieldErrorMetadata(name, child)) {
        visit(child, [...path, name]);
      }
    });
  };

  visit(errors, []);
  return flattened;
}

export function hasRegisteredField(
  fields: Record<string, unknown>,
  name: string,
) {
  let current: unknown = fields;

  for (const segment of name.replaceAll(/\[(\d+)\]/g, ".$1").split(".")) {
    if (!isRecord(current)) {
      return false;
    }

    current = current[segment];
    if (isRecord(current) && "_f" in current) {
      return true;
    }
  }

  return false;
}

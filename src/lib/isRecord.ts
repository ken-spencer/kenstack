import isPlainObject from "lodash-es/isPlainObject";

// Narrows unknown input to a plain string-keyed record.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

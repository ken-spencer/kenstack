import type { ServerField } from ".";

export function booleanField(): ServerField {
  return { filterConfig: { kind: "boolean" } };
}

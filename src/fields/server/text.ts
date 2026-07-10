import type { ServerField } from ".";

export function textField(): ServerField {
  return { filterConfig: { kind: "text" } };
}

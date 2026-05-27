import type { ServerFieldDefaults } from ".";

export function textField(): ServerFieldDefaults {
  return {
    behavior: {
      filter: { kind: "text" },
    },
  };
}

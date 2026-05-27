import type { ServerFieldDefaults } from ".";

export function booleanField(): ServerFieldDefaults {
  return {
    behavior: {
      filter: { kind: "boolean" },
    },
  };
}

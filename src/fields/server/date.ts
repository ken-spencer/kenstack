import * as z from "zod";
import type { ServerFieldDefaults } from ".";

const dateServerSchema = z.union([
  z.iso.date(),
  z
    .string()
    .datetime({ precision: 3 })
    .transform((value) => value.slice(0, 10)),
  z.date().transform((value) => value.toISOString().slice(0, 10)),
  z.literal("").transform(() => null),
  z.null(),
  z.undefined().transform(() => null),
]);

export function dateField(): ServerFieldDefaults {
  return {
    zod: dateServerSchema,
    behavior: {
      filter: { kind: "date-range" },
    },
  };
}

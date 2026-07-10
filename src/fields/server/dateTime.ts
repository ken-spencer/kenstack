import * as z from "zod";
import type { ServerField } from ".";

const dateTimeServerSchema = z.union([
  z.date(),
  z
    .string()
    .datetime({ precision: 3 })
    .transform((value) => new Date(value)),
  z.literal("").transform(() => null),
  z.null(),
  z.undefined().transform(() => null),
]);

export function dateTimeField(): ServerField {
  return {
    zod: dateTimeServerSchema,
    filterConfig: { kind: "date-range" },
  };
}

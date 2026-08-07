import * as z from "zod";

import { defineField } from "../field";

export const dateField = defineField({
  kind: "date",
  default: "",
  filterKind: "date-range",
  zod: z.union([
    z.iso.date(),
    z
      .string()
      .datetime({ precision: 3 })
      .transform((value) => value.slice(0, 10)),
    z.date().transform((value) => value.toISOString().slice(0, 10)),
    z.literal(""),
    z.null().transform(() => ""),
    z.undefined().transform(() => ""),
  ]),
});

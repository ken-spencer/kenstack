import * as z from "zod";

import { defineField } from "../field";

export const dateTimeField = defineField({
  kind: "datetime",
  default: "",
  filterKind: "date-range",
  zod: z.union([
    z.date().transform((value) => value.toISOString()),
    z.string().datetime({ precision: 3 }),
    z.literal(""),
    z.null().transform(() => ""),
    z.undefined().transform(() => ""),
  ]),
});

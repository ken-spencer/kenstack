import * as z from "zod";
import "server-only";

import { dateTimeField as isomorphicDateTimeField } from ".";
import { defineServerField } from "../serverField";

export const dateTimeField = defineServerField(isomorphicDateTimeField, {
  zod: z.union([
    z
      .string()
      .datetime({ precision: 3 })
      .transform((value) => new Date(value)),
    z.literal("").transform(() => null),
  ]),
});

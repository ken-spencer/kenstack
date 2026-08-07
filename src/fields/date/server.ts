import * as z from "zod";
import "server-only";

import { dateField as isomorphicDateField } from ".";
import { defineServerField } from "../serverField";

export const dateField = defineServerField(isomorphicDateField, {
  zod: z.union([z.iso.date(), z.literal("").transform(() => null), z.null()]),
});

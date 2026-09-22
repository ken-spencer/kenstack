import * as z from "zod";
import { unsecureIdSchema } from "@kenstack/fields/unsecureId";

export const storedSchema = z.object({
  id: unsecureIdSchema,
  choicesKey: z.string(),
});

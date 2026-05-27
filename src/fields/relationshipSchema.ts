import * as z from "zod";

const relationshipValueSchema = z.object({
  id: z.number(),
  label: z.string(),
});

export const relationshipSchema = z.array(relationshipValueSchema);

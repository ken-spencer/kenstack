import { objectId, date } from "@kenstack/schemas/atoms";
import * as z from "zod";

export const metaSchema = z.object({
  createdAt: date("client"),
  updatedAt: date("client"),
  deleted: z.boolean(),
  createdBy: objectId("client").nullable().optional(),
});

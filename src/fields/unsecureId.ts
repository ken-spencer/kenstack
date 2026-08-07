import * as z from "zod";

export const unsecureIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-z]{15}$/, "ID must be 15 lowercase letters or numbers");

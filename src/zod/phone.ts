import * as z from "zod";

export const phone = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{3}-\d{3}-\d{4}$/.test(value),
    "Enter a phone number in ###-###-#### format.",
  );

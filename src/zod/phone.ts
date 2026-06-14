import * as z from "zod";

export const phone = z
  .string()
  .trim()
  .regex(
    /^$|^\d{3}-\d{3}-\d{4}$/,
    "Enter a phone number in ###-###-#### format.",
  );

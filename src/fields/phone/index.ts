import * as z from "zod";

import { defineField } from "../field";

export const phone = z
  .string()
  .trim()
  .regex(
    /^$|^\d{3}-\d{3}-\d{4}$/,
    "Enter a phone number in ###-###-#### format.",
  );

export const phoneField = defineField({
  default: "",
  zod: phone,
  kind: "phone",
});

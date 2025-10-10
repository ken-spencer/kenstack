import * as z from "zod";

const passwordSchema = () =>
  z
    .string()
    .trim()
    .refine(
      (val) => val === "" || val.length >= 8,
      "Password must be at least 8 characters"
    )
    .refine(
      (val) => val === "" || /[a-z]/.test(val),
      "Password must include at least one lowercase letter"
    )
    .refine(
      (val) => val === "" || /[A-Z]/.test(val),
      "Password must include at least one uppercase letter"
    )
    .refine(
      (val) => val === "" || /\d/.test(val),
      "Password must include at least one number"
    )
    .refine(
      (val) => val === "" || /^\S+$/.test(val),
      "Password cannot contain spaces"
    );

export default passwordSchema;

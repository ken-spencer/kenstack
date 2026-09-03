import { password } from "./password";
import * as z from "zod";

export default z
  .object({
    currentPassword: z.string().optional(),
    password: password.min(8, "Password must be at least 8 characters"),
    confirmPassword: password,
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "The passwords must match",
    path: ["confirmPassword"],
  });

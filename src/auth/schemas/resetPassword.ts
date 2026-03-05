import { password } from "@kenstack/schemas/atoms";
import * as z from "zod";

const schema = z
  .object({
    password: password().min(8, "Password must be at least 8 characters"),
    confirmPassword: password(),
    token: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "The passwords must match",
    path: ["confirmPassword"],
  });

export default schema;

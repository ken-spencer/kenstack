import * as z from "zod";
import { emailSchema } from "@kenstack/auth/email/verification/schemas";
import { password } from "./password";

const loginSchema = z.object({
  email: emailSchema,
  password: password.min(1, "Password is required"),
  returnTo: z.string().optional(),
});

export default loginSchema;

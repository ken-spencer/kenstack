import * as z from "zod";
import { emailSchema } from "@kenstack/auth/email/verification/schemas";
import { password } from "./password";

const loginSchema = z.object({
  email: emailSchema,
  password: password.min(1, "Password is required"),
  recaptchaToken: z.string().optional().catch(undefined),
  returnTo: z.string().optional(),
  // Set by a confirmation sign-in: the account its page was rendered for.
  userId: z.number().int().positive().optional(),
});

export default loginSchema;

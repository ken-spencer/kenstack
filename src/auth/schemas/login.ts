import * as z from "zod";
import { emailSchema } from "@kenstack/auth/email/verification/schemas";
import { protectedAccountSchema } from "@kenstack/auth/reauthentication";
import { password } from "./password";

const loginSchema = z.object({
  email: emailSchema,
  password: password.min(1, "Password is required"),
  returnTo: z.string().optional(),
  // Set by a confirmation sign-in: the account its page was rendered for.
  userId: protectedAccountSchema.shape.userId.optional(),
});

export default loginSchema;

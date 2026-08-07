import * as z from "zod";
import { email } from "@kenstack/fields/email";
import { password } from "./password";

const loginSchema = z.object({
  email,
  password: password.min(1, "Password is required"),
  recaptchaToken: z.string().optional().catch(undefined),
  returnTo: z.string().optional(),
});

export default loginSchema;

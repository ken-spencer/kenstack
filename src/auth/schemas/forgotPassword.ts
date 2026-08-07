import * as z from "zod";
import { email } from "@kenstack/fields/email";

const forgotPasswordSchema = z.object({
  email,
  recaptchaToken: z.string().optional().catch(undefined),
});

export default forgotPasswordSchema;

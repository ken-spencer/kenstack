import * as z from "zod";
import { email } from "@kenstack/zod/email";

const forgotPasswordSchema = z.object({
  email,
  recaptchaToken: z.string().optional().catch(undefined),
});

export default forgotPasswordSchema;

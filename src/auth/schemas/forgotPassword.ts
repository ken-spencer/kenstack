import * as z from "zod";
import { email } from "@kenstack/fields/email";

const forgotPasswordSchema = z.object({
  email,
});

export default forgotPasswordSchema;

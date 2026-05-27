import * as z from "zod";
import { email } from "@kenstack/zod/email";

const forgotPasswordSchema = z.object({
  email,
});

export default forgotPasswordSchema;

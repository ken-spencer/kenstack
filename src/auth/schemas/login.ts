import * as z from "zod";
import { email } from "@kenstack/zod/email";
import { password } from "@kenstack/zod/password";

const loginSchema = z.object({
  email,
  password: password.min(1, "Password is required"),
  returnTo: z.string().optional(),
});

export default loginSchema;

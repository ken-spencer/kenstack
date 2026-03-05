import * as z from "zod";
import { password, email } from "@kenstack/schemas/atoms";

const loginSchema = z.object({
  email: email(),
  password: password().min(1, "Password is required"),
});

export default loginSchema;

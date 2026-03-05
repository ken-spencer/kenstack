import * as z from "zod";
import { email } from "@kenstack/schemas/atoms";

const forgotPasswordSchema = z.object({
  email: email(),
});

export default forgotPasswordSchema;

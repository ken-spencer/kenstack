import * as z from "zod";
import { email } from "@kenstack/fields/email";

export const emailSchema = email.max(
  320,
  "Enter an email address with 320 characters or fewer",
);

export const challengeKeySchema = z.uuid();

export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the six-digit code");

export const tokenSchema = z.base64url().length(43);

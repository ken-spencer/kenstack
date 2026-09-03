import * as z from "zod";

import {
  challengeKeySchema,
  codeSchema,
  emailSchema,
  tokenSchema,
} from "@kenstack/auth/email/verification/schemas";

export const emailLoginLinkFailureCodeSchema = z.enum([
  "expired",
  "invalid",
  "wrong-account",
  "wrong-browser",
]);

export type EmailLoginLinkFailureCode = z.infer<
  typeof emailLoginLinkFailureCodeSchema
>;

export const requestEmailLoginSchema = z.object({
  challengeKey: challengeKeySchema.optional(),
  email: emailSchema,
  // The requesting page declares that its returnTo destination hosts the
  // link verifier, so the emailed link can land there instead of on /login.
  linkToReturnTo: z.boolean().optional(),
  recaptchaToken: z.string().optional().catch(undefined),
  returnTo: z.string().optional(),
});

export const loginCodeSchema = z.object({
  code: codeSchema,
});

export const verifyEmailLoginCodeSchema = loginCodeSchema.extend({
  challengeKey: challengeKeySchema,
  returnTo: z.string().optional(),
});

export const verifyEmailLoginLinkSchema = z.object({
  returnTo: z.string().optional(),
  token: tokenSchema,
});

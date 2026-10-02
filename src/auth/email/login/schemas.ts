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
  "wrong-browser",
]);

export type EmailLoginLinkFailureCode = z.infer<
  typeof emailLoginLinkFailureCodeSchema
>;

export const requestEmailLoginSchema = z.object({
  challengeKey: challengeKeySchema.optional(),
  // Set by a confirmation sign-in, which always sends its code.
  confirmation: z.literal(true).optional(),
  email: emailSchema,
  // The requesting page declares that its returnTo destination hosts the
  // link verifier, so the emailed link can land there instead of on /login.
  linkToReturnTo: z.boolean().optional(),
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

import * as z from "zod";

import { protectedAccountSchema } from "@kenstack/auth/reauthentication";
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
  email: emailSchema,
  // The requesting page declares that its returnTo destination hosts the
  // link verifier, so the emailed link can land there instead of on /login.
  linkToReturnTo: z.boolean().optional(),
  returnTo: z.string().optional(),
  // Set by a confirmation sign-in: the account its page was rendered for.
  userId: protectedAccountSchema.shape.userId.optional(),
});

export const loginCodeSchema = z.object({
  code: codeSchema,
});

export const verifyEmailLoginCodeSchema = loginCodeSchema.extend({
  challengeKey: challengeKeySchema,
  returnTo: z.string().optional(),
  // Set by a confirmation sign-in: the account its page was rendered for, and that account's email.
  email: emailSchema.optional(),
  userId: protectedAccountSchema.shape.userId.optional(),
});

export const verifyEmailLoginLinkSchema = z.object({
  returnTo: z.string().optional(),
  token: tokenSchema,
});

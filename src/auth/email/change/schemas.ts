import * as z from "zod";

import {
  challengeKeySchema,
  codeSchema,
  emailSchema,
  tokenSchema,
} from "@kenstack/auth/email/verification/schemas";

export const requestEmailChangeSchema = z.object({
  challengeKey: challengeKeySchema.optional(),
  email: emailSchema,
});

export const emailChangeCodeSchema = z.object({
  code: codeSchema,
});

export const verifyEmailChangeCodeSchema = emailChangeCodeSchema.extend({
  challengeKey: challengeKeySchema,
});

export const verifyEmailChangeLinkSchema = z.object({
  token: tokenSchema,
});

export const cancelEmailChangeSchema = z.object({
  challengeKey: challengeKeySchema,
});

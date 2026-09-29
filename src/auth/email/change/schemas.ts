import * as z from "zod";

import {
  challengeKeySchema,
  codeSchema,
  emailSchema,
  tokenSchema,
} from "@kenstack/auth/email/verification/schemas";
import { protectedAccountSchema } from "@kenstack/auth/reauthentication";

export const emailChangeEmailSchema = z.object({
  email: emailSchema,
});

export const requestEmailChangeSchema = emailChangeEmailSchema.extend({
  ...protectedAccountSchema.shape,
  challengeKey: challengeKeySchema.optional(),
});

export const emailChangeCodeSchema = z.object({
  code: codeSchema,
});

export const verifyEmailChangeCodeSchema = emailChangeCodeSchema.extend({
  ...protectedAccountSchema.shape,
  challengeKey: challengeKeySchema,
});

export const verifyEmailChangeLinkSchema = protectedAccountSchema.extend({
  token: tokenSchema,
});

export const cancelEmailChangeSchema = z.object({
  challengeKey: challengeKeySchema,
});

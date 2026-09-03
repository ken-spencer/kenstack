import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

import { db } from "@app/db";
import {
  checkQuota,
  consumeQuota,
  pipeline,
  pipelineStage,
  recaptcha,
  type PipelineOptions,
} from "@kenstack/api";

import type { LoginActionResult } from "@kenstack/auth/api";
import { login as loginUser } from "@kenstack/auth/server/auth";
import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import loginSchema from "@kenstack/auth/schemas/login";
import { loadFreshPublicAuthState } from "@kenstack/auth/server/state";
import { audit } from "@kenstack/logger";

export const passwordFailureLimit = [3, "15 minutes"] as const;

export const loginPipeline = () => (options: PipelineOptions) =>
  pipeline(options, login());

const login = () =>
  pipelineStage(
    { schema: loginSchema },
    async ({
      data: { email, password, recaptchaToken, returnTo },
      request,
      response,
    }) => {
      // Only failures count (see recordPasswordFailure); a successful sign-in
      // consumes nothing. Locked after 3 failures per account in 15 minutes.
      const locked = await checkQuota("password-failure", {
        email,
        limits: { email: passwordFailureLimit },
      });
      if (locked) {
        return response.error({
          message:
            "Sign-in is temporarily unavailable because too many recent requests were made. Please wait and try again.",
          status: 429,
        });
      }

      const recaptchaRejection = await recaptcha({
        action: "login",
        request,
        response,
        token: recaptchaToken,
      });
      if (recaptchaRejection) {
        return recaptchaRejection;
      }

      const user = await db.query.users.findFirst({
        columns: { id: true, passwordHash: true },
        where: (u, { and, isNull }) =>
          and(sql`lower(${u.email}) = ${email}`, isNull(u.deletedAt)),
      });

      if (!user || !user.passwordHash) {
        // prevent introspection using timing.
        await bcrypt.compare(
          "fake-to-delay",
          "$2b$12$vU8SBwjV2ZMjNFqpESF7lug7JWrU3A3EfBFpT.lqUal5tlqvdIcV",
        );

        await recordPasswordFailure(email, null);
        return response.error(passwordFailureMessage);
      }

      if (!(await bcrypt.compare(password, user.passwordHash))) {
        await recordPasswordFailure(email, user.id);
        return response.error(passwordFailureMessage);
      }

      const path = getSafeReturnToPath(returnTo) ?? "/";

      await loginUser(user.id);

      return response.success<LoginActionResult>({
        authenticated: true,
        authState: await loadFreshPublicAuthState(),
        path,
      });
    },
  );

export async function recordPasswordFailure(
  email: string,
  userId: number | null,
) {
  await consumeQuota("password-failure", { email });
  await audit({
    action: "password-failure",
    data: { email },
    userId,
  });
}

const passwordFailureMessage =
  "Please try again. If you are unable to sign in, choose the email sign-in option instead. Your access will temporarily be suspended after three failed login attempts.";

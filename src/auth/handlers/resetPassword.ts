import bcrypt from "bcrypt";

import {
  pipeline,
  PipelineOptions,
  type PipelineAction,
} from "@kenstack/lib/api";
import schema from "@kenstack/auth/schemas/resetPassword";
import { deps } from "@app/deps";
import { and, eq, gte, isNull } from "drizzle-orm";

import crypto from "crypto";
import { PipelineResponse } from "@kenstack/lib/api/PipelineResponse";

class TransactionError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const resetPasswordPipeline = () => (options: PipelineOptions) =>
  pipeline({ ...options, schema }, [resetPasswordAction]);

const resetPasswordAction: PipelineAction<typeof schema> = async ({
  data,
  response,
}) => {
  const { token } = data;
  const now = new Date();

  const { passwordResetRequests: prr, users } = deps.tables;

  if (token) {
    if (!token.match(/^[A-Za-z0-9_-]{32}$/)) {
      return errorResponse(
        response,
        "That password reset link isn't valid. Please request a new one below."
      );
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [fp] = await deps.db
      .select({
        email: prr.email,
        invalidatedAt: prr.invalidatedAt,
        expiresAt: prr.expiresAt,
      })
      .from(prr)
      .where(eq(prr.tokenHash, tokenHash));

    if (!fp) {
      return errorResponse(
        response,
        "That password reset link isn't valid. Please request a new one below."
      );
    }

    if (fp.invalidatedAt) {
      return errorResponse(
        response,
        "That password reset link has already been used. Please request a new one below."
      );
    }
    if (fp.expiresAt < now) {
      return errorResponse(
        response,
        "That password reset link has expired. Please request a new one below."
      );
    }

    const [user] = await deps.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, fp.email), isNull(users.deletedAt)));

    if (!user) {
      return errorResponse(
        response,
        "We couldn't find an account for that reset link. Please request a new link below."
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    // let updated;
    try {
      await deps.db.transaction(async (tx) => {
        const consumed = await tx
          .update(prr)
          .set({ invalidatedAt: now })
          .where(
            and(
              eq(prr.tokenHash, tokenHash),
              isNull(prr.invalidatedAt),
              gte(prr.expiresAt, now)
            )
          )
          .returning({ tokenHash: prr.tokenHash });

        if (consumed.length !== 1) {
          throw new TransactionError(
            "NOT_CONSUMED",
            "The token was not consumed."
          );
        }

        const updatedUser = await tx
          .update(users)
          .set({
            passwordHash,
            updatedAt: now,
          })
          .where(eq(users.id, user.id))
          .returning({ id: users.id });

        /**  */
        if (updatedUser.length !== 1) {
          throw new TransactionError(
            "USER_UPDATE_FAILED",
            "There was a problem updating your password. Please try again."
          );
        }

        return updatedUser;
      });
    } catch (err) {
      if (err instanceof TransactionError) {
        if (err.code === "NOT_CONSUMED") {
          return errorResponse(
            response,
            "That password reset link is no longer valid. Please request a new one below."
          );
        }

        if (err.code === "USER_UPDATE_FAILED") {
          return errorResponse(response, err.message);
        }
      }
      throw err;
    }

    // if (!updated.length) {
    //   /** token is consumed so the user will need a new one.  */
    //   return errorResponse(
    //     response,
    //     "We couldn't update your password. Please request a new link below."
    //   );
    // }

    await deps.auth.login(user.id);
    await deps.logger.audit({
      action: "reset-password",
      userId: user.id,
      data: { method: "token", email: fp.email },
    });
  } else {
    const user = await deps.auth.getCurrentUser();

    if (!user) {
      return response.redirectToLogin();
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const updated = await deps.db
      .update(users)
      .set({
        passwordHash,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .returning({ id: users.id });

    if (!updated.length) {
      /** user is logged in, No reason to redirect. */
      return response.error(
        "We couldn't update your password. Please try again."
      );
    }
    await deps.logger.audit({ action: "reset-password", userId: user.id });
  }

  return response.success({
    message: "Your password has successfully been set.",
  });
};

const errorResponse = (response: PipelineResponse, message: string) => {
  response.cookies.set({
    name: "forgottenPasswordMessage",
    value: message,
    maxAge: 60,
    path: "/forgot-password",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false, // cookie read and deleted in client.
  });

  return response.json({
    redirect: "/forgot-password",
  });
};

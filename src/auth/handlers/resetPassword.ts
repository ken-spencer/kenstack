import bcrypt from "bcrypt";

import { pipeline, PipelineOptions, pipelineStage } from "@kenstack/api";
import schema from "@kenstack/auth/schemas/resetPassword";
import { deps } from "@app/deps";
import { and, eq, gte, isNull } from "drizzle-orm";

import crypto from "crypto";
import { PipelineResponse } from "@kenstack/api/PipelineResponse";
import { hasRecentPasswordAuthentication } from "@kenstack/auth/passwordChange";
import {
  enforcePasswordAttemptLimit,
  recordPasswordFailure,
} from "@kenstack/auth/handlers/login";

class TransactionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const resetPasswordPipeline = () => (options: PipelineOptions) =>
  pipeline(options, resetPasswordAction);

const resetPasswordAction = pipelineStage(
  { schema },
  async ({ data, request, response }) => {
    const { token } = data;
    const now = new Date();

    const { passwordResetRequests: prr, sessions, users } = deps.tables;

    if (token) {
      if (!token.match(/^[A-Za-z0-9_-]{32}$/)) {
        return errorResponse(
          response,
          "That password reset link isn't valid. Please request a new one below.",
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
          "That password reset link isn't valid. Please request a new one below.",
        );
      }

      if (fp.invalidatedAt) {
        return errorResponse(
          response,
          "That password reset link has already been used. Please request a new one below.",
        );
      }
      if (fp.expiresAt < now) {
        return errorResponse(
          response,
          "That password reset link has expired. Please request a new one below.",
        );
      }

      const [user] = await deps.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, fp.email), isNull(users.deletedAt)));

      if (!user) {
        return errorResponse(
          response,
          "We couldn't find an account for that reset link. Please request a new link below.",
        );
      }

      const passwordHash = await bcrypt.hash(data.password, 12);
      try {
        await deps.db.transaction(async (tx) => {
          const consumed = await tx
            .update(prr)
            .set({ invalidatedAt: now })
            .where(
              and(
                eq(prr.tokenHash, tokenHash),
                isNull(prr.invalidatedAt),
                gte(prr.expiresAt, now),
              ),
            )
            .returning({ tokenHash: prr.tokenHash });

          if (consumed.length !== 1) {
            throw new TransactionError(
              "NOT_CONSUMED",
              "The token was not consumed.",
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

          if (updatedUser.length !== 1) {
            throw new TransactionError(
              "USER_UPDATE_FAILED",
              "There was a problem updating your password. Please try again.",
            );
          }

          await tx.delete(sessions).where(eq(sessions.userId, user.id));

          return updatedUser;
        });
      } catch (err) {
        if (err instanceof TransactionError) {
          if (err.code === "NOT_CONSUMED") {
            return errorResponse(
              response,
              "That password reset link is no longer valid. Please request a new one below.",
            );
          }

          if (err.code === "USER_UPDATE_FAILED") {
            return errorResponse(response, err.message);
          }
        }
        throw err;
      }

      await deps.auth.login(user.id);
      await deps.logger.audit({
        action: "reset-password",
        userId: user.id,
        data: { method: "token", email: fp.email },
      });
    } else {
      const session = await deps.auth.getCurrentSession();

      if (!session) {
        return response.redirectToLogin();
      }

      if (session.impersonatedBy !== null) {
        return response.error(
          "Password changes are unavailable while you are signed in as another user. Return to your own account first.",
        );
      }

      if (!hasRecentPasswordAuthentication(session, now)) {
        if (data.currentPassword === undefined) {
          return response.error(
            "Your recent login has expired. Refresh this page and enter your current password.",
          );
        }

        if (!data.currentPassword) {
          return response.error({
            message:
              "Please review the form and correct the highlighted fields.",
            fieldErrors: {
              currentPassword: "Enter your current password",
            },
          });
        }

        const [currentUser] = await deps.db
          .select({
            email: users.email,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1);

        if (!currentUser) {
          return response.redirectToLogin();
        }

        const limited = await enforcePasswordAttemptLimit(
          currentUser.email,
          request,
          response,
        );
        if (limited) {
          return limited;
        }

        if (
          !currentUser.passwordHash ||
          !(await bcrypt.compare(
            data.currentPassword,
            currentUser.passwordHash,
          ))
        ) {
          await recordPasswordFailure(currentUser.email, request);

          return response.error({
            message:
              "Please review the form and correct the highlighted fields.",
            fieldErrors: {
              currentPassword: "The current password is incorrect",
            },
          });
        }
      }

      const passwordHash = await bcrypt.hash(data.password, 12);
      const updated = await deps.db.transaction(async (tx) => {
        const rows = await tx
          .update(users)
          .set({
            passwordHash,
            updatedAt: now,
          })
          .where(eq(users.id, session.userId))
          .returning({ id: users.id });

        if (rows.length !== 1) {
          return [];
        }

        await tx.delete(sessions).where(eq(sessions.userId, session.userId));

        return rows;
      });

      if (updated.length !== 1) {
        return response.error(
          "We couldn't update your password. Please try again.",
        );
      }

      await deps.auth.login(session.userId);
      await deps.logger.audit({
        action: "reset-password",
        userId: session.userId,
        data: { method: "session" },
      });
    }

    return response.success({
      message: "Your password has successfully been set.",
    });
  },
);

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

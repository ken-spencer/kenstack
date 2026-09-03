import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "@app/db";
import { modules } from "@app/modules";
import {
  checkQuota,
  pipeline,
  type PipelineOptions,
  pipelineStage,
} from "@kenstack/api";
import {
  passwordFailureLimit,
  recordPasswordFailure,
} from "@kenstack/auth/handlers/login";
import { requiresCurrentPassword } from "@kenstack/auth/passwordChange";
import schema from "@kenstack/auth/schemas/resetPassword";
import { login } from "@kenstack/auth/server/auth";
import { getCurrentSession } from "@kenstack/auth/server/user";
import { sessions } from "@kenstack/db/tables/sessions";
import { normalizeEmail } from "@kenstack/fields/email";
import { audit } from "@kenstack/logger";

export const resetPasswordPipeline = () => (options: PipelineOptions) =>
  pipeline(
    options,
    pipelineStage({ schema }, async ({ data, response }) => {
      const now = new Date();
      const users = modules.users.admin.table;
      const session = await getCurrentSession();

      if (!session) {
        return response.redirectToLogin();
      }

      if (session.impersonatedBy !== null) {
        return response.error(
          "Password changes are unavailable while impersonating a user. Choose Logout to return to your administrator account, then open the user in Users and select Send onboarding email.",
        );
      }

      const [currentUser] = await db
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

      if (requiresCurrentPassword(currentUser, session, now)) {
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

        const normalizedEmail = normalizeEmail(currentUser.email);

        // Same lockout as sign-in: 3 failures per account in 15 minutes.
        if (
          await checkQuota("password-failure", {
            email: normalizedEmail,
            limits: { email: passwordFailureLimit },
          })
        ) {
          return response.error({
            message:
              "Too many incorrect password attempts. Please wait before trying again.",
            status: 429,
          });
        }

        if (
          !(await bcrypt.compare(
            data.currentPassword,
            currentUser.passwordHash,
          ))
        ) {
          await recordPasswordFailure(normalizedEmail, session.userId);

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
      if (
        !(await db.transaction(async (tx) => {
          if (
            !(
              await tx
                .update(users)
                .set({ passwordHash, updatedAt: now })
                .where(eq(users.id, session.userId))
                .returning({ id: users.id })
            )[0]
          ) {
            return false;
          }

          await tx.delete(sessions).where(eq(sessions.userId, session.userId));
          return true;
        }))
      ) {
        return response.error(
          "We couldn't update your password. Please try again.",
        );
      }

      await login(session.userId);
      await audit({
        action: "reset-password",
        userId: session.userId,
        data: { method: "session" },
      });

      return response.success({
        message: "Your password has successfully been set.",
      });
    }),
  );

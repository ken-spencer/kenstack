import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@app/db";
import { modules } from "@app/modules";
import { pipelineStage } from "@kenstack/api";
import { requireRecentAuthentication } from "@kenstack/auth/reauthentication/server";
import schema from "@kenstack/auth/schemas/resetPassword";
import { login } from "@kenstack/auth/server/auth";
import { userSessionsCacheTag } from "@kenstack/auth/server/user";
import { sessions } from "@kenstack/db/tables/sessions";
import { audit } from "@kenstack/logger";

export const resetPasswordPipeline = pipelineStage(
  { access: "authenticated", schema },
  async ({ data, request, response }) => {
    const now = new Date();
    const users = modules.users.admin.table;
    const session = await requireRecentAuthentication(request);

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

    revalidateTag(userSessionsCacheTag(session.userId), { expire: 0 });

    await login(session.userId);
    await audit({
      action: "reset-password",
      userId: session.userId,
      data: { method: "session" },
    });

    return response.success({
      message: "Your password has successfully been set.",
    });
  },
);

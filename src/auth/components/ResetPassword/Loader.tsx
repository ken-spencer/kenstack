import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@app/db";
import { modules } from "@app/modules";
import { getCurrentSession } from "@kenstack/auth/server/user";
import { requiresCurrentPassword } from "@kenstack/auth/passwordChange";
import Notice from "@kenstack/components/Notice";

import Form from "./Form";

const loginPath = "/login?returnTo=%2Freset-password";

export default async function ResetPasswordFormLoader() {
  const session = await getCurrentSession();
  if (!session) {
    redirect(loginPath);
  }

  if (session.impersonatedBy !== null) {
    return (
      <Notice>
        Password changes are unavailable while impersonating a user. Choose
        Logout to return to your administrator account, then open the user in
        Users and select Send onboarding email.
      </Notice>
    );
  }

  const users = modules.users.admin.table;
  const [currentUser] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!currentUser) {
    redirect(loginPath);
  }

  return (
    <Form
      requiresCurrentPassword={requiresCurrentPassword(currentUser, session)}
    />
  );
}

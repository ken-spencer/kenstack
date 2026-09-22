import { redirect } from "next/navigation";

import { getCurrentSession } from "@kenstack/auth/server/user";
import { getAuthenticationRemainingMs } from "@kenstack/auth/reauthentication";
import ReauthenticationTimer from "@kenstack/auth/reauthentication/Timer";
import { getReauthenticationPath } from "@kenstack/auth/returnTo";
import Notice from "@kenstack/components/Notice";

import Form from "./Form";

export default async function ResetPasswordFormLoader({
  path,
}: {
  path: `/${string}`;
}) {
  const loginPath = `/login?returnTo=${encodeURIComponent(path)}`;
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

  const remainingMs = getAuthenticationRemainingMs(session);
  if (remainingMs <= 0) {
    redirect(getReauthenticationPath(path));
  }

  return (
    <>
      <ReauthenticationTimer
        key={session.createdAt.toISOString()}
        remainingMs={remainingMs}
      />
      <Form />
    </>
  );
}

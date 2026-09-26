import { redirect } from "next/navigation";

import { getCurrentSession } from "@kenstack/auth/server/user";
import ReauthenticationForm from "@kenstack/auth/reauthentication/Form";
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

  return (
    <ReauthenticationForm message="To change your password, please confirm your identity.">
      <Form />
    </ReauthenticationForm>
  );
}

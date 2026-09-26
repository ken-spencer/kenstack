import type { ReactNode } from "react";
import { loadLoginFormProps } from "@kenstack/auth/components/Login/loadFormProps";
import LoginForm from "@kenstack/auth/components/Login/Form";
import { getCurrentSession } from "@kenstack/auth/server/user";
import { loadAuthState } from "@kenstack/auth/server/state";
import ReauthenticationFormClient from "./FormClient";
import { serializeAuthorization } from "./server";

// Callers decide whether the visitor needs proof, which requires a signed-in visitor.
export default async function ReauthenticationForm({
  children,
  message,
}: {
  children: ReactNode;
  message: string;
}) {
  const [authState, session] = await Promise.all([
    loadAuthState(),
    getCurrentSession(),
  ]);
  if (authState.state !== "authenticated" || !session) {
    throw new Error("ReauthenticationForm requires a signed-in visitor");
  }
  const { method } = await loadLoginFormProps();

  return (
    <ReauthenticationFormClient
      authorization={serializeAuthorization(session)}
      message={message}
      loginForm={
        <LoginForm
          email={authState.email}
          method={method}
          mode="reauthentication"
        />
      }
    >
      {children}
    </ReauthenticationFormClient>
  );
}

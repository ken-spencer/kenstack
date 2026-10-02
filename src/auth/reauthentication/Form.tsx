import type { ReactNode } from "react";
import { loadLoginFormProps } from "@kenstack/auth/components/Login/loadFormProps";
import { loadAuthState } from "@kenstack/auth/server/state";
import ReauthenticationFormClient from "./FormClient";

// Wraps a sensitive area for a signed-in visitor. Its children always render; a submit the server
// refuses for stale authorization opens a confirmation and then runs again.
export default async function ReauthenticationForm({
  children,
  message,
}: {
  children: ReactNode;
  message: string;
}) {
  const authState = await loadAuthState();
  if (authState.state !== "authenticated") {
    throw new Error("ReauthenticationForm requires a signed-in visitor");
  }
  const { method } = await loadLoginFormProps();

  return (
    <ReauthenticationFormClient
      email={authState.email}
      message={message}
      method={method}
      userId={authState.userId}
    >
      {children}
    </ReauthenticationFormClient>
  );
}

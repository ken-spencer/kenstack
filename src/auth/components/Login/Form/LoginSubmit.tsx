import type { ReactNode } from "react";

import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import Submit from "@kenstack/forms/Submit";

import type { Continuation } from "./continuation";
import LinkButton from "./LinkButton";

// Every sign-in form has the same action row, in a flow too; a confirmation adds Cancel, and a
// password form outside one adds "Forgot Your Password?".
export default function LoginSubmit({
  children,
  continuation,
  label,
  onForgotPassword,
}: {
  children: ReactNode;
  continuation: Continuation;
  label: string;
  onForgotPassword?: (form: HTMLFormElement | null) => void;
}) {
  const { cancel } = useAuthorization();
  return (
    <div className="login-actions">
      <div>
        <Submit>{label}</Submit>
        {children}
      </div>
      {continuation.mode === "reauthentication" ? (
        <LinkButton onClick={cancel}>Cancel</LinkButton>
      ) : onForgotPassword ? (
        <LinkButton
          onClick={({ currentTarget }) => onForgotPassword(currentTarget.form)}
        >
          Forgot Your Password?
        </LinkButton>
      ) : null}
    </div>
  );
}

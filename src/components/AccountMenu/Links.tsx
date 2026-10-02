"use client";

import type { ReactNode } from "react";

import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useSignInChange, useUserInfo } from "@kenstack/auth/useUserInfo";
import Avatar from "@kenstack/components/Avatar";
import { formatUserInitials } from "@kenstack/lib/user";

import LogoutButton from "./LogoutButton";
import SignInChangedDialog from "./SignInChangedDialog";

export default function AccountLinks({
  authState: initialAuthState,
  children,
  fallback,
}: {
  authState: PublicAuthState;
  children: ReactNode;
  fallback: ReactNode;
}) {
  const user = useUserInfo(initialAuthState);
  const { hasChanged, reopen } = useSignInChange();

  // A proven email, with no account yet, gets the links too, so it can be signed out.
  if (user.state !== "authenticated" && user.state !== "proven") {
    return fallback;
  }

  const identity =
    user.state === "authenticated" ? (
      <>
        <Avatar initials={user.initials} url={user.avatar?.url} />
        {user.name}
      </>
    ) : (
      <>
        <Avatar initials={formatUserInitials(user)} />
        <span className="break-all">{user.email}</span>
      </>
    );

  // While a sign-in change in another tab stands, the old account shows greyed and only brings back
  // its dialog: no links and no Logout.
  if (hasChanged) {
    return (
      <>
        <SignInChangedDialog authState={initialAuthState} />
        <button
          type="button"
          className="menu-heading opacity-50"
          onClick={reopen}
        >
          {identity}
        </button>
      </>
    );
  }

  // The dialog keeps its place in both branches, so it never remounts when a sign-in change appears.
  return (
    <>
      <SignInChangedDialog authState={initialAuthState} />
      <div className="menu-heading">{identity}</div>
      {/* Rendered for the server's signed-in account, so a proven visitor never sees them. */}
      {user.state === "authenticated" && children}
      <LogoutButton />
    </>
  );
}

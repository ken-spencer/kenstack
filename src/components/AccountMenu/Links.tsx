"use client";

import type { ReactNode } from "react";

import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import Avatar from "@kenstack/components/Avatar";
import { formatUserInitials } from "@kenstack/lib/user";

import LogoutButton from "./LogoutButton";

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

  // A proven email, with no account yet, gets the links too, so it can be signed out.
  if (user.state !== "authenticated" && user.state !== "proven") {
    return fallback;
  }

  return (
    <>
      <div className="menu-heading">
        {user.state === "authenticated" ? (
          <>
            <Avatar initials={user.initials} url={user.avatar?.url} />
            {user.name}
          </>
        ) : (
          <>
            <Avatar initials={formatUserInitials(user)} />
            <span className="break-all">{user.email}</span>
          </>
        )}
      </div>
      {/* Rendered for the server's signed-in account, so a proven visitor never sees them. */}
      {user.state === "authenticated" && children}
      <LogoutButton />
    </>
  );
}

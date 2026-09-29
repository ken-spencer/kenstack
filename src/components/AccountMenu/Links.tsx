"use client";

import type { ReactNode } from "react";

import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import Avatar from "@kenstack/components/Avatar";

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

  if (user.state !== "authenticated") {
    return fallback;
  }

  return (
    <>
      <div className="menu-heading">
        <Avatar initials={user.initials} url={user.avatar?.url} />
        {user.name}
      </div>
      {children}
      <LogoutButton />
    </>
  );
}

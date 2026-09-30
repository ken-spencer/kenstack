"use client";
import { useState, type ReactNode } from "react";
import Avatar from "@kenstack/components/Avatar";
import { useUserInfo } from "@kenstack/auth/useUserInfo";
import type { PublicAuthState } from "@kenstack/auth/server/state";
import { formatUserInitials } from "@kenstack/lib/user";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";

import LogoutButton from "./LogoutButton";

export default function AccountMenu({
  authState: initialAuthState,
  children,
  fallback,
}: {
  authState: PublicAuthState;
  children: ReactNode;
  fallback: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const user = useUserInfo(initialAuthState);

  // A proven email, with no account yet, gets the menu too, so it can be signed out.
  if (user.state !== "authenticated" && user.state !== "proven") {
    return fallback;
  }

  return (
    <div className="flex items-center gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="focus-visible:ring-sidebar-ring cursor-pointer rounded-full underline-offset-4 transition hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {user.state === "authenticated" ? (
              <Avatar initials={user.initials} url={user.avatar?.url} />
            ) : (
              <Avatar initials={formatUserInitials(user)} />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="account-menu flex w-44 flex-col gap-1 p-1.5"
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("a,button")
            ) {
              setOpen(false);
            }
          }}
        >
          {user.state === "proven" ? (
            <div className="menu-heading break-all">{user.email}</div>
          ) : (
            children
          )}
          <LogoutButton />
        </PopoverContent>
      </Popover>
    </div>
  );
}

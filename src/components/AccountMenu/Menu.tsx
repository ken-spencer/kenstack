"use client";
import { useState, type ReactNode } from "react";
import { type User } from "@kenstack/types";
import Avatar from "@kenstack/components/Avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";

import LogoutButton from "./LogoutButton";

export default function AccountMenu({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="focus-visible:ring-sidebar-ring cursor-pointer rounded-full underline-offset-4 transition hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            <Avatar initials={user.initials} url={user.avatar?.url} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex w-44 flex-col gap-1 p-1.5"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a,button")) {
              setOpen(false);
            }
          }}
        >
          {children}
          <LogoutButton />
        </PopoverContent>
      </Popover>
    </div>
  );
}

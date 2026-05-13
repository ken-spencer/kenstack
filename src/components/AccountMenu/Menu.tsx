"use client";
import { type User } from "@kenstack/types";
import { useLayoutEffect, useRef } from "react";
import { useAdminUi } from "@kenstack/hooks/useAdminUi";
// import Link from "next/link";
import Avatar from "@kenstack/components/Avatar";

import LogoutButton from "./LogoutButton";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/ui/popover";

import { PopoverClose } from "@radix-ui/react-popover";

export default function AccountMenu({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const { setCanEdit } = useAdminUi();
  useLayoutEffect(() => {
    if (user?.roles.includes("admin")) {
      setCanEdit(true);
    }
  }, [user, setCanEdit]);

  return (
    <div className="flex items-center gap-4">
      <Popover>
        <PopoverTrigger className="focus-visible:ring-sidebar-ring cursor-pointer rounded-full underline-offset-4 transition hover:underline focus-visible:ring-2 focus-visible:outline-none">
          <Avatar initials={user.initials} url={user.avatar?.url} />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex w-44 flex-col gap-1 p-1.5"
          onClick={() => ref.current?.click()}
        >
          <PopoverClose className="hidden" ref={ref} />
          {children}
          <LogoutButton />
        </PopoverContent>
      </Popover>
    </div>
  );
}

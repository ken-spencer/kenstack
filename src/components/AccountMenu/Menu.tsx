"use client";
import { type User } from "@kenstack/types";
import { useRef, useEffect } from "react";
import { useAdminUi } from "@kenstack/hooks/useAdminUi";
// import Link from "next/link";
import Avatar from "@kenstack/components/Avatar";

// import AccountMenuItems from "./Items";
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
  useEffect(() => {
    if (user?.roles.includes("admin")) {
      setCanEdit(true);
    }
  }, [user, setCanEdit]);

  return (
    <div className="flex items-center gap-4">
      <Popover>
        <PopoverTrigger className="cursor-pointer">
          <Avatar initials={user.initials} url={user.avatar} />
        </PopoverTrigger>
        <PopoverContent
          className="flex w-max flex-col px-8"
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

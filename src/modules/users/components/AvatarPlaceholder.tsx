"use client";

import { useFormContext } from "react-hook-form";
import { UserRound } from "lucide-react";

import Avatar from "@kenstack/components/Avatar";

export default function AvatarPlaceholder() {
  const { watch } = useFormContext();
  const givenName = watch("givenName");
  const familyName = watch("familyName");
  const initials =
    (typeof givenName === "string" ? givenName.slice(0, 1) : "") +
    (typeof familyName === "string" ? familyName.slice(0, 1) : "");

  if (initials) {
    return <Avatar initials={initials} className="size-full text-5xl" />;
  }

  return (
    <div className="flex size-full items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <UserRound className="size-16" />
    </div>
  );
}

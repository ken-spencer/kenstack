"use client";

import { useFormContext } from "react-hook-form";
import { UserRound } from "lucide-react";

import Avatar from "@kenstack/components/Avatar";
import { formatUserInitials } from "@kenstack/lib/user";

export default function AvatarPlaceholder() {
  const { watch } = useFormContext();
  const givenName = watch("givenName");
  const familyName = watch("familyName");
  const initials = formatUserInitials({ familyName, givenName });

  if (initials) {
    return <Avatar initials={initials} className="size-full text-5xl" />;
  }

  return (
    <div className="flex size-full items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <UserRound className="size-16" />
    </div>
  );
}

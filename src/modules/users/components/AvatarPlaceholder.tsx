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
    <div className="border-border bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full border">
      <UserRound className="size-16" />
    </div>
  );
}

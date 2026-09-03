"use client";

import { useFormContext } from "react-hook-form";

import Avatar from "@kenstack/components/Avatar";
import { formatUserInitials } from "@kenstack/lib/user";

export default function AvatarPlaceholder() {
  const { watch } = useFormContext();
  const givenName = watch("givenName");
  const familyName = watch("familyName");

  return (
    <Avatar
      initials={formatUserInitials({ familyName, givenName })}
      className="size-full text-5xl"
    />
  );
}

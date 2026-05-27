"use client";

import Link from "next/link";

import Avatar from "@kenstack/components/Avatar";
import MetaDates from "@kenstack/admin/components/MetaDates";
import type { ListItemRow } from "@kenstack/admin/client";
import type { SelectedImage } from "@kenstack/db/tables";

type UserListRow = ListItemRow<{
  avatar?: SelectedImage | null;
  email?: string | null;
  familyName?: string | null;
  givenName?: string | null;
}>;

function getInitials(givenName?: string | null, familyName?: string | null) {
  return (givenName?.slice(0, 1) ?? "") + (familyName?.slice(0, 1) ?? "");
}

export function UserNameListItem({ row }: { row: UserListRow }) {
  const name = [row.givenName, row.familyName].filter(Boolean).join(" ");

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link href={row.path}>
        <Avatar
          initials={getInitials(row.givenName, row.familyName)}
          url={row.avatar?.url}
          className="size-10 shrink-0"
        />
      </Link>
      <div className="flex min-w-0 flex-col">
        <Link className="min-w-0 truncate text-lg" href={row.path}>
          {name || row.email || `ID ${row.id}`}
        </Link>
        <MetaDates createdAt={row.createdAt} updatedAt={row.updatedAt} />
      </div>
    </div>
  );
}

export function UserEmailListItem({ row }: { row: UserListRow }) {
  return (
    <span className="block truncate text-sm text-gray-600">
      {row.email ?? ""}
    </span>
  );
}

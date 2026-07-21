"use client";

import Link from "next/link";

import Avatar from "@kenstack/components/Avatar";
import MetaDates from "@kenstack/admin/components/MetaDates";
import type { ListItemRow } from "@kenstack/admin/client";
import type { SelectedMedia } from "@kenstack/db/tables";
import { formatUserInitials, formatUserName } from "@kenstack/lib/user";

type UserListRow = ListItemRow<{
  avatar?: SelectedMedia | null;
  email?: string | null;
  familyName?: string | null;
  givenName?: string | null;
}>;

export function UserAvatarListItem({ row }: { row: UserListRow }) {
  return (
    <Link href={row.path}>
      <Avatar
        initials={formatUserInitials(row)}
        url={row.avatar?.url}
        className="size-8 shrink-0"
      />
    </Link>
  );
}

export function UserNameListItem({ row }: { row: UserListRow }) {
  return (
    <div className="flex min-w-0 flex-col">
      <Link className="min-w-0 truncate text-lg" href={row.path}>
        {formatUserName(row, { fallback: `ID ${row.id}` })}
      </Link>
      <MetaDates record={row} />
    </div>
  );
}

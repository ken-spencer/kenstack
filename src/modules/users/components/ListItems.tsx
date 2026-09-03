"use client";

import Link from "next/link";

import Avatar from "@kenstack/components/Avatar";
import Updated from "@kenstack/admin/components/Updated";
import type { ListItemRow } from "@kenstack/admin/client";
import type { SelectedMedia } from "@kenstack/db/queries";
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
      <Link className="max-w-full self-start truncate text-lg" href={row.path}>
        {formatUserName(row, { fallback: `ID ${row.id}` })}
      </Link>
      <Updated value={row.updatedAt} />
    </div>
  );
}

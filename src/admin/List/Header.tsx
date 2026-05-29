"use client";

import { Eye, Plus } from "lucide-react";
import IconButton from "@kenstack/components/IconButton";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { draftModePath } from "@kenstack/admin/lib/searchParams";
import { useAdminList } from "./context";
import DeleteButton, { RestoreButton } from "./DeleteButton";
import FilterControl from "./FilterControl";
import KeywordSearch from "./KeywordSearch";
import SortControl from "./SortControl";
import TrashToggle from "./TrashToggle";

export default function AdminListHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { basePath } = useAdminList();

  return (
    <header>
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex-grow">
          <IconButton tooltip="New Entry" asChild>
            <Link
              href={
                pathname +
                "/new" +
                (searchParams.size ? "?" + searchParams : "")
              }
            >
              <Plus className="size-6 text-gray-800" />
            </Link>
          </IconButton>
        </div>
        <SortControl />
        <KeywordSearch />
        <FilterControl />
        <RestoreButton />
        {basePath ? (
          <IconButton tooltip="View Content" asChild>
            <a
              href={draftModePath("enable-draft", basePath)}
              target="_blank"
              rel="noreferrer"
            >
              <Eye className="size-6 text-gray-800" />
            </a>
          </IconButton>
        ) : null}
        <TrashToggle />
        <DeleteButton />
      </div>
    </header>
  );
}

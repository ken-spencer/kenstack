"use client";

import { Plus } from "lucide-react";
import IconButton from "@kenstack/components/IconButton";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import DeleteButton, { RestoreButton } from "./DeleteButton";
import FilterControl from "./FilterControl";
import KeywordSearch from "./KeywordSearch";
import SortControl from "./SortControl";
import TrashToggle from "./TrashToggle";

export default function AdminListHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        <TrashToggle />
        <DeleteButton />
      </div>
    </header>
  );
}

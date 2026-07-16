"use client";

import { Eye, Plus } from "lucide-react";
import Button from "@kenstack/components/Button";
import FilterControl from "@kenstack/list/FilterControl";
import KeywordSearch from "@kenstack/list/KeywordSearch";
import SortControl from "@kenstack/list/SortControl";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { draftModePath } from "@kenstack/admin/lib/searchParams";
import { useAdminList } from "./context";
import DeleteButton, { RestoreButton } from "./DeleteButton";
import TrashToggle from "./TrashToggle";

export default function AdminListHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { basePath, filter, filters, setFilters, sort } = useAdminList();

  return (
    <header>
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex-grow">
          <Button asChild size="icon" tooltip="New Entry" variant="ghost">
            <Link
              href={
                pathname +
                "/new" +
                (searchParams.size ? "?" + searchParams : "")
              }
            >
              <Plus className="text-foreground size-6" />
            </Link>
          </Button>
        </div>
        <SortControl filters={filters} setFilters={setFilters} sort={sort} />
        <KeywordSearch filters={filters} setFilters={setFilters} />
        <FilterControl
          filter={filter}
          filters={filters}
          setFilters={setFilters}
        />
        <RestoreButton />
        {basePath ? (
          <Button asChild size="icon" tooltip="View Content" variant="ghost">
            <a
              href={draftModePath("enable-draft", basePath)}
              target="_blank"
              rel="noreferrer"
            >
              <Eye className="text-foreground size-6" />
            </a>
          </Button>
        ) : null}
        <TrashToggle />
        <DeleteButton />
      </div>
    </header>
  );
}

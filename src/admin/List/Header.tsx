import { Plus } from "lucide-react";
import IconButton from "@kenstack/components/IconButton";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import DeleteButton from "./DeleteButton";
import KeywordSearch from "./KeywordSearch";
import Filter from "./Filter";

export default function AdminListHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <header>
      <div className="flex gap-4 items-center">
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
        <KeywordSearch />
        <Filter />
        <DeleteButton />
      </div>
    </header>
  );
}

import { Input } from "@kenstack/forms/controls/Input";
import { cn } from "@kenstack/lib/utils";
import { Search, X } from "lucide-react";
import type { ListQueryStoreState } from "@kenstack/list/querySchema";
import type { SetQueryStore } from "@kenstack/list/useQueryStore";

export default function KeywordSearch({
  className,
  filters,
  placeholder = "Enter keywords",
  setFilters,
}: {
  className?: string;
  filters: Pick<ListQueryStoreState, "keywords">;
  placeholder?: string;
  setFilters: SetQueryStore<ListQueryStoreState>;
}) {
  return (
    <div className={cn("flex max-w-sm items-center p-1", className)}>
      <Search className="-mr-7 ml-1 size-6" />
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={filters.keywords}
        name="search"
        autoComplete="off"
        onChange={(evt) => {
          setFilters((prev) => ({ ...prev, keywords: evt.target.value }));
        }}
      />
      <button
        aria-label="Clear search"
        type="button"
        className={cn(
          "bg-foreground text-background -ml-5 size-4 shrink-0 items-center justify-center rounded-full",
          filters.keywords.length ? "flex" : "hidden",
        )}
        onClick={() => setFilters((prev) => ({ ...prev, keywords: "" }))}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

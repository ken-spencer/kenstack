import { Input } from "@kenstack/forms/controls/Input";
import { cn } from "@kenstack/lib/utils";
import { Search, X } from "lucide-react";
import type { ListQueryStoreState } from "@kenstack/list/querySchema";
import type { SetQueryStore } from "@kenstack/list/useQueryStore";

export default function KeywordSearch<
  T extends Pick<ListQueryStoreState, "keywords">,
>({
  className,
  filters,
  id,
  maxLength,
  placeholder = "Enter keywords",
  setFilters,
}: {
  className?: string;
  filters: Pick<T, "keywords">;
  id?: string;
  maxLength?: number;
  placeholder?: string;
  setFilters: SetQueryStore<T>;
}) {
  return (
    <div className={cn("flex max-w-sm items-center p-1", className)}>
      <Input
        id={id}
        maxLength={maxLength}
        startAdornment={<Search className="pointer-events-none size-4" />}
        endAdornment={
          filters.keywords.length ? (
            <button
              aria-label="Clear search"
              type="button"
              className="bg-foreground text-background flex size-4 items-center justify-center rounded-full"
              onClick={() => setFilters((prev) => ({ ...prev, keywords: "" }))}
            >
              <X className="size-3" />
            </button>
          ) : null
        }
        placeholder={placeholder}
        value={filters.keywords}
        name="search"
        autoComplete="off"
        onChange={(evt) => {
          setFilters((prev) => ({ ...prev, keywords: evt.target.value }));
        }}
      />
    </div>
  );
}

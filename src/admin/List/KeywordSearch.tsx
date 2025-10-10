import { Input } from "@kenstack/components/ui/input";
import { Search, CircleX } from "lucide-react";
import { useAdminList } from "./context";

export default function KeywordSearch() {
  const { filters, setFilters } = useAdminList();
  return (
    <div className="flex max-w-sm items-center p-1">
      <Search className="-mr-7 ml-1 size-6" />
      <Input
        className="pl-9"
        placeholder="Enter keywords"
        value={filters.keywords}
        name="search"
        autoComplete="off"
        onChange={(evt) => {
          setFilters((prev) => ({ ...prev, keywords: evt.target.value }));
        }}
      />
      <button
        type="button"
        className={"-ml-5" + (filters.keywords.length ? "" : " hidden")}
        onClick={() => setFilters((prev) => ({ ...prev, keywords: "" }))}
      >
        <CircleX className="text-gray-800 size-4" />
      </button>
    </div>
  );
}

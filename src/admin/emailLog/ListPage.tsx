import HydratedQuery from "@kenstack/context/HydratedQuery";
import { getFilterMeta, getSortMeta } from "@kenstack/admin/types/list";
import {
  parseListSearchParams,
  type ListSearchParams,
} from "@kenstack/list/querySchema";
import EmailLogList from "./List";
import {
  emailLogSort,
  listEmailMessages,
  loadEmailLogFilters,
} from "./queries";
import { buildEmailLogQueryKey } from "./queryKey";

// The Email Log: every email the site sent except error reports, newest first, with its outcome.
export default async function EmailLogPage({
  search,
}: {
  search: ListSearchParams;
}) {
  const filters = await loadEmailLogFilters();
  const query = parseListSearchParams({
    filters,
    sort: emailLogSort,
    searchParams: search,
  });

  return (
    <div className="space-y-4 py-2">
      <h1 className="text-2xl font-semibold">Email Log</h1>
      <HydratedQuery
        queryKey={buildEmailLogQueryKey(query)}
        data={{
          status: "success",
          ...(await listEmailMessages(query, filters)),
        }}
      >
        <EmailLogList
          filter={getFilterMeta(filters)}
          sort={getSortMeta(emailLogSort)}
        />
      </HydratedQuery>
    </div>
  );
}

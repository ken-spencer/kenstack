import type { ListQuery } from "@kenstack/list/querySchema";

// The Email Log list's query key, shared by the page's server hydration and the client list.
export function buildEmailLogQueryKey(query: ListQuery) {
  return ["admin", "email-log", query];
}

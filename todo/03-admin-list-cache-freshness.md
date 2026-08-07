# Admin post-mutation list freshness

## Status

**Deferred until the current version is reviewed and committed.** This needs isolated reproduction from a clean baseline before changing shared admin navigation or cache behavior.

## Problem

After an admin save, trash, or restore navigates to a list, the list can briefly show its pre-mutation rows. Reloading shows the correct database state. No hydration errors occurred.

The standard mutation handlers already expire the server list tag with blocking semantics:

```ts
revalidateTag(adminListCacheTag(name), { expire: 0 });
```

The list is also loaded in a Server Component, dehydrated into React Query, and then fetched through the admin list API. That leaves several possible sources for the stale paint:

- retained inactive React Query data after `invalidateQueries()`;
- a stale RSC/Next router payload that hydrates after the client query was invalidated; or
- another navigation timing issue across those two boundaries.

Do not treat the current evidence as a settled root cause.

## Investigation notes

`updateTag(tag)` differs from `revalidateTag(tag, { expire: 0 })` in one material way: within a Server Action, Next marks the tag as immediately revalidated and sends the action revalidation signal through the Flight response. The client action reducer then evicts its prefetch/segment cache and refreshes dynamic data. A normal JSON Route Handler response does not pass through that reducer.

An Events-only Server Action probe was briefly exercised locally. It saved a disposable Event, called `updateTag(adminListCacheTag("events"))`, and then navigated to the list. The action path completed successfully, but the original stale flash was not reproduced reliably enough to establish a result. The probe was removed; no production behavior is retained from that experiment.

## Next investigation

1. Reproduce the stale flash from a clean baseline using a disposable admin record.
2. Inspect the list query immediately before and after `HydrationBoundary` applies the server payload. Establish whether the stale rows originate in retained React Query data or in the incoming RSC payload.
3. If the RSC/router payload is stale, test a mutation owned by a Server Action with `updateTag(adminListCacheTag(name))`; keep persistence and invalidation in the same request. Do not imitate Next's private action headers or router reducer.
4. If retained query data is the cause, clear or replace only the affected inactive admin-list query before navigation. Preserve intentional placeholder behavior for ordinary list filtering and pagination.
5. Add a focused regression test at the smallest boundary that can distinguish the server payload from the client query state. Avoid a broad cache reset or a route-wide revalidation unless the reproduced behavior requires it.

## Acceptance criteria

- Save, trash, and restore navigation never briefly displays the prior list state.
- The chosen invalidation has a demonstrated owner and does not rely on private Next.js headers or reducer internals.
- Normal list filter, sort, pagination, and optimistic bulk-remove behavior remain responsive.
- A focused regression check covers the established source of the stale paint.

# Runtime Boundaries

Consult this reference for React APIs, client state, Next.js routes, Client and Server Components, dynamic
imports, caching, Suspense, and public runtime boundaries.

## Next.js

- Before Next.js work, read the relevant installed guide in `node_modules/next/dist/docs/`; the
  installed version is the source of truth.
- A component exported from a `"use client"` module crosses the Server Component boundary as a
  registered client reference, not an ordinary function prop. A Server Component may select and pass
  that reference to another Client Component. Ordinary callbacks stay on the client or become Server
  Functions.
- When a Client Component renders date or time text using the environment's local timezone or
  current-time-relative formatting during server rendering, add `suppressHydrationWarning` to the exact
  text-bearing element or input whose value can legitimately differ in the browser. Suppression covers
  that element only, never a parent section or a structural mismatch. Dates formatted with an explicit
  timezone or otherwise deterministic need no suppression.
- Keep data loading on the server unless the UI requires client-side updates.
- A page load never mutates: no database write, cookie change, email, external write or cache
  expiry, directly or through `after()` or `waitUntil()`. Mutations run in route handlers.

## React APIs and Client State

- Before adding or changing React API patterns in shared controls or client UI primitives, check the
  installed React version and current React documentation when the API may have changed, and use the
  current project-compatible API, such as passing `ref` as a prop; `React.forwardRef` is deprecated.
- For client-side API loading, use TanStack React Query with the shared `fetcher`. Ad hoc `useEffect`
  fetching is for behavior React Query cannot express.
- Before adding local state, refs, maps, or context to preserve query or cache data, inspect the owning
  library's retention and cache APIs. React Query server state has one owner; demonstrate the missing
  capability before adding another.
- Effects and lifecycle callbacks are synchronization boundaries. State derived during render, ordinary
  control flow, and work already owned by an event, query, mutation, or action stay where they are.
- Load data at the narrowest useful consumer; a parent aggregates unrelated authentication, routing,
  configuration, and record data only when it uses them itself.
- Keep terminal UI states direct: explicit returns or one shared shell, with no temporary status or
  message state and no duplicated loading, empty, error, or success shells.

## Module Clients and Dynamic Imports

- For lazy or dynamic loaders meant to keep optional client code out of the initial bundle, make the
  loader itself a Client Component. A Next.js bug can cause a Server Component loader, even one with a
  conditional or dynamic import, to pull the loaded client module and its dependencies into the build
  or route bundle.
- A module's `client/index.ts` starts with `"use client"` and holds only lazy imports, because the
  server module definition imports it. Without that boundary, its dynamic imports can bundle the
  module's admin client onto public pages. On the server it is a client reference: pass it through
  as a prop and never read or call its properties there.
- Admin server routes decide whether an admin route exists from server-owned module config, such as
  `moduleConfig.admin`. A module's client is UI behavior, not route existence: an admin route never
  checks `moduleConfig.client` before rendering, and a missing client loader never calls `notFound()`.
  Validate client config only inside client components that consume it.
- Fix public bundle leakage in the importing graph while preserving the client loader boundary, or
  explicitly accept the measured trade-off. Moving a loader to
  server-only or server-safe code reintroduces the bundling problem.
- Before adding, removing, or moving a `"use client"` directive or a dynamic import of a Client
  Component, establish why the boundary is safe. When the goal is bundle reduction, verify with a production build before and
  after, once the user has authorized production builds.

## Server-Only Entry Points

Before adding `server-only`, a server-only import, or a server builder to an existing `index.ts` or barrel,
search every importer of that entry point. If any importer belongs to a Client Component graph, keep the
barrel client-safe or move those consumers to explicit client-safe subpaths in the same change. A
barrel's runtime boundary is determined by its consumers, not only by its directives.

- Reserve `api` in filenames, folder names, and symbol qualifiers for server-owned API code; the import
  boundary treats any `api` path segment as server-only, except the client-safe entries
  `@kenstack/api/errors` and `@kenstack/api/fetcher`. Name a client-side wrapper for HTTP endpoints
  by its actual role, such as `requests.ts`.
- Isomorphic code stays on an isomorphic entry point or subpath, even when its current callers are all
  server-side; server-only code stays off client and shared entry points.
- Keep server-only helpers (fetchers, database queries, HTML parsers, API action internals, server
  lifecycle helpers) in a separate module from helpers Client Components consume (request builders, URL
  builders, field helpers, option lists, presentation helpers). API-only helpers go under the module's
  `api/` folder or another server-owned path; shared helpers go in an isomorphic file.

## Public Discovery

- Robots files are public and are not access control. Keep robots disallow rules to broad technical
  buckets such as `/admin` and `/api/` unless the user explicitly asks for a public crawl rule; private,
  account, auth, and unlisted page paths are protected by auth, redirects, and `noindex` metadata or
  headers, never enumerated in `robots.txt` or `robots.ts`.

## Caching and Suspense

- In cached functions or components, place `cacheTag(...)` as high as it can go without changing
  behavior, beside `"use cache"` and `cacheLife(...)` (for a list, the `cacheTags` option of
  `listQuery(...)`), so cache identity is visible with the other cache
  setup.
- Kenstack applications deploy to serverless infrastructure. Use `"use cache: remote"` when caching
  database or API query results so every server instance shares the cached read; regular `"use cache"`
  is for cached components or values whose purpose is prerendering, prefetching, or client stale-time.
- Cache a read when the same key is likely to be read again before its cache is cleared: a news
  article read by many visitors, a list's default first page, a person's organizations read through a
  flow. Use the helpers in `@kenstack/db/queries`, following
  `docs/module-anatomy.md#canonical-public-query-patterns`: `listQuery(...)` and `pageQuery(...)` for
  published module content, `query(table)` where its clauses fit, and Drizzle directly otherwise,
  inside a `"use cache: remote"` function. A list's search, filter, sort and later pages stay uncached
  unless their keys are bounded and repeat, such as a public news list filtered by a CMS tag; a scope
  such as a parent record, user or theatre is part of the key, not a filter. A tag shared by many keys,
  such as a site-wide `payments` tag on per-user pages, clears every entry on any change, so weigh it
  when judging reuse. Reading a cached function again in the same request is fine.
- Every write that changes anything a cached read selects, joined records and "not found" results
  included, clears a tag the entry carries, after its commit and before its response. Handle time with a
  check outside the cache or a lifetime that ends when the answer changes, as `listQuery(...)` does for
  a future publication.
- Set the lifetime by who changes the data. Content staff edit in the admin stays correct until they
  edit it again, so it lives for `cacheLife("max")` and its tags clear it. Data driven by a person's
  own activity, such as their transactions, is read during their visit and may never be read again, so
  it lives about an hour (`cacheLife({ expire: 3600 })`), or no longer than the answer holds, such as a
  hold's expiry.
- Don't cache a read whose key won't be read again, such as a sign-in attempt, an upload or a search,
  and never put password hashes or sign-in proofs in a shared cache. Read uncached when a change clears
  no tag (Stripe state, quotas), for rows the read's own transaction locks or writes, or after a write
  in the same request that the read must see. An API action that only reads other data, such as admin
  content, uses the cached read, before any transaction it opens: a cached read that misses inside a
  transaction needs a second pooled connection while the transaction holds one, and two such requests
  can wait on each other. When both are needed, the cached function wraps the
  uncached query and a `Fresh`-named function gives the uncached read (`getCurrentUser`,
  `getFreshCurrentUser`); call the cached one wherever possible.
- The session read behind `getCurrentUser` and `loadAuthState` is cached this way, and every access
  check reads it. Every mutation that changes a session's authority (login, logout, impersonation,
  password reset, user save or removal) revalidates the session or user tag with blocking expiration
  immediately after its write, before any audit or follow-up task; a new mutation that touches sessions
  or user roles must do the same. Module saves and removals expire the users record tag carried by
  session snapshots automatically; direct writes still need explicit invalidation. See
  `docs/admin.md#record-saving`.
- A query answers whether data exists: a missing record is `null` or an empty list, never a thrown
  error. Only a real failure, such as an unreachable database, throws. Inside a cached function this
  matters twice over: a thrown error reaches its caller without its class, so a `ReturnedError` meant
  as a 404 becomes a 500. The caller outside the cache turns a miss into its 404.
- Perform authorization outside a cached scope. An entry several people read never includes one
  person's permissions or private state; a person's own data is keyed by their id, as the session and
  their organizations are. An admin mutation expires the record, list, and dependent public tags only
  after its transaction commits.
- Preserve read-after-write behavior explicitly. In a Server Action, use `updateTag(tag)` when the next
  request must see the write. In a Route Handler, use blocking expiration such as
  `revalidateTag(tag, { expire: 0 })`. Return the committed row in place of an immediate reload; when
  the same request genuinely needs a fresh reread, use an uncached authoritative query, because request
  memoization may still hold a value read before the mutation. A CMS save whose editor must immediately
  see the result never relies on stale-while-revalidate invalidation.
- Publication-owned public list and detail reads follow the canonical `listQuery(...)` and
  `pageQuery(...)` patterns in `docs/module-anatomy.md#canonical-public-query-patterns`, which own Draft
  Mode resolution, visibility timing before pagination, filtered variants, and the list/detail
  publication race. `revalidate` alone is stale-while-revalidate and can serve the old result to the
  first request after publication; those patterns use a hard `expire` instead.
- Keep client `stale` within the acceptable user-visible delay for scheduled transitions and editorial
  changes, even when the server's `revalidate` and `expire` ceilings are days or months.
- When server loaders might be called from more than one component or query path during a single page
  render, wrap the shared database or API work in `React.cache` so duplicate calls deduplicate within
  the request; primitive cache keys or stable arguments let equivalent calls hit the same entry.
- Use a height-preserving loading component or skeleton for page bodies or content sections with
  meaningful latency, so a perceptibly rendered fallback never collapses the suspended content and pulls
  persistent headers and footers together. `<Suspense fallback={null}>`, or a component API that
  silently defaults to a null fallback, is acceptable for small fixed-size slots whose surrounding
  layout already reserves the space, work that resolves before the fallback is visibly displayed, or
  standalone layouts without surrounding chrome. Judge the actual surrounding layout and expected
  latency; a large Suspense subtree does not by itself call for a large duplicate skeleton. Review each
  perceptibly rendered route or Suspense fallback against its resolved subtree, including nested
  boundaries: it must preserve stable above-fold structure and known media dimensions so streamed
  content cannot briefly expose the footer or repeatedly displace already-rendered content. A non-null
  skeleton alone is not sufficient.

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

## Client Registries and Dynamic Imports

- For lazy or dynamic loaders meant to keep optional client code out of the initial bundle, make the
  loader itself a Client Component. A Next.js bug can cause a Server Component loader, even one with a
  conditional or dynamic import, to pull the loaded client module and its dependencies into the build
  or route bundle.
- Admin and client registries that call `defineAdminClients` or export module `clients` maps start with
  `"use client"`. This boundary is required even when a server module imports the file today: without
  the directive, the registry's dynamic imports can be bundled like direct imports, leaking every
  registered admin or client module onto every public page and massively increasing browser download
  size. Import-boundary concerns, lint preferences, bundle analysis, and a wish to make the file look
  server-safe are never reasons to remove it.
- Admin server routes decide whether an admin route exists from server-owned module config, such as
  `moduleConfig.admin`. Client registry wiring is UI behavior, not route existence: an admin route never
  checks `moduleConfig.client` before rendering, and a missing client loader never calls `notFound()`.
  Validate client config only inside client components that consume it.
- Fix public bundle leakage in the importing route or module graph while keeping the registry a Client
  Component, or explicitly accept the measured bundle trade-off. Moving Client Component loaders into
  Server Components, `server-only` files, or server-safe helper files triggers the same Next.js
  bundling bug. When a larger fix is justified, split server-only module definitions from admin client
  registries, or pass client-enabled modules only at the admin entry point. A client registry appearing
  in a public route graph is not evidence that it should be server-safe.
- Before changing any file with `"use client"` or any dynamic import of a Client Component, establish
  why the boundary is safe. When the goal is bundle reduction, verify with a production build before and
  after, once the user has authorized production builds.

## Server-Only Entry Points

Before adding `server-only`, a server-only import, or a server builder to an existing `index.ts` or barrel,
search every importer of that entry point. If any importer belongs to a Client Component graph, keep the
barrel client-safe or move those consumers to explicit client-safe subpaths in the same change. A
barrel's runtime boundary is determined by its consumers, not only by its directives.

- Reserve `api` in filenames, folder names, and symbol qualifiers for server-owned API code; the import
  boundary treats any `api` path segment as server-only. Name a client-side wrapper for HTTP endpoints
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
  behavior, beside `"use cache"` and `cacheLife(...)`, so cache identity is visible with the other cache
  setup.
- Kenstack applications deploy to serverless infrastructure. Use `"use cache: remote"` when caching
  database or API query results so every server instance shares the cached read; regular `"use cache"`
  is for cached components or values whose purpose is prerendering, prefetching, or client stale-time.
- The cache boundary is a read-model boundary, not a blanket database-query rule. Transactional
  decisions, uniqueness and availability checks, authorization, command-side validation, and reads that
  determine a write observe the authoritative source and stay outside shared caches.
- Shared admin content reads may use regular or remote caching. Perform authorization outside the
  shared cached scope; a shared entry never includes the current user's permissions or private state.
  An admin mutation expires the record, list, and dependent public tags only after its transaction
  commits.
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
- Cache final variants for bounded domain filters such as CMS-owned tag slugs. Normalize or resolve an
  unbounded public search value before making it a shared cache key; the presence of a search parameter
  is not a reason to bypass caching.
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

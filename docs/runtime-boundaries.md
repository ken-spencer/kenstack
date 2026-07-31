# Runtime Boundaries

Consult this reference for React APIs, client state, Next.js routes, Client and Server Components, dynamic
imports, caching, Suspense, and public runtime boundaries.

## Next.js

- Before Next.js work, read the relevant installed guide in `node_modules/next/dist/docs/`; the
  installed version is the source of truth.
- Use the App Router.
- Prefer Server Components by default.
- Add `"use client"` only when needed.
- Do not pass non-serializable values from server to client components.
- When a Client Component renders date or time text using the environment's local timezone or
  current-time-relative formatting during server rendering, add `suppressHydrationWarning` to the exact
  text-bearing element or input whose value can legitimately differ in the browser. Do not suppress a
  parent section or use suppression for structural mismatches. Dates formatted with an explicit timezone
  or otherwise guaranteed to be deterministic do not need suppression.
- Keep data loading on the server unless the UI requires client-side updates.

## React APIs and Client State

- Before adding or changing React API patterns in shared controls or client UI primitives, check the
  installed React version and current React documentation when the API may have changed. Do not introduce
  a deprecated pattern when current documentation provides a simpler project-compatible API, such as
  passing `ref` as a prop instead of using `React.forwardRef`.
- For client-side API loading, use TanStack React Query with the shared `fetcher`. Avoid ad hoc
  `useEffect` fetching unless React Query cannot express the required behavior.
- Before adding local state, refs, maps, or context to preserve query or cache data, inspect the owning
  library's retention and cache APIs. Do not mirror React Query server state; demonstrate the missing
  capability before adding another state owner.

## Client Registries and Dynamic Imports

- For lazy/dynamic loaders that are meant to keep optional client code out of the initial bundle, make the
  loader itself a Client Component. A Next.js bug can cause a Server Component loader, even one with a
  conditional or dynamic import, to pull the loaded client module and its dependencies into the
  build/route bundle.
- Admin/client registries that call `defineAdminClients` or export module `clients` maps must start with
  `"use client"`. This is a required boundary, even when the file is imported by a server module today.
  If the directive is removed, the registry's dynamic imports can be bundled like direct imports, causing
  every registered admin/client module to leak onto every public page and massively increasing browser
  download size. Do not remove the directive to satisfy import-boundary concerns, lint preferences, bundle
  analysis, or a desire to make the file look server-safe.
- Admin server routes decide whether an admin route exists from server-owned module config, such as
  `moduleConfig.admin`, not from client loaders or client registries. Do not check `moduleConfig.client`
  before rendering an admin route and do not make a missing client loader call `notFound()`. Client
  registry wiring is UI behavior, not route existence. Validate client config only inside client
  components that consume it.
- Do not fix public bundle leakage by moving Client Component loaders into Server Components,
  `server-only` files, or server-safe helper files. That can trigger the same Next.js bundling bug and pull
  the dynamically imported Client Components and their dependencies into route bundles.
- If a client registry appears in a public route graph, do not reinterpret that as evidence the registry
  should be server-safe. Either fix the importing route/module graph while keeping the registry as a
  Client Component, or explicitly accept the measured bundle trade-off. If a larger fix is justified,
  split server-only module definitions from admin client registries, or pass client-enabled modules only
  at the admin entry point.
- Before changing any file with `"use client"` or any dynamic import of a Client Component, establish why
  the boundary is safe. If the goal is bundle reduction, verify with a production build before and after
  when the user has authorized production builds.

## Server-Only Entry Points

Before adding `server-only`, a server-only import, or a server builder to an existing `index.ts` or barrel,
search every importer of that entry point. If any importer belongs to a Client Component graph, keep the
barrel client-safe or update those consumers to explicit client-safe subpaths in the same change. A
barrel's runtime boundary is determined by its consumers, not only by its directives.

- Isomorphic code must not be re-exported through a server-only barrel merely because its current callers
  are server-side. Keep it on an isomorphic entry point or subpath. Likewise, do not expose server-only
  code through client or shared entry points.
- Keep server-only helpers separate from helpers consumed by Client Components. Do not put server-only
  fetchers, database queries, HTML parsers, API action internals, or server lifecycle helpers in the same
  module as client-used request builders, URL builders, field helpers, option lists, or presentation
  helpers. Put API-only helpers under the module's `api/` folder or another server-owned path, and keep
  shared helpers in an isomorphic file.

## Routes and Discovery

- Use route handlers for API endpoints.
- Do not enumerate private, account, auth, or unlisted page paths in `robots.txt` or `robots.ts`. Robots
  files are public and are not access control; use auth, redirects, and `noindex` metadata/headers for
  those pages instead. Keep robots disallow rules to broad technical buckets such as `/admin` and `/api/`,
  unless the user explicitly asks for a public crawl rule.

## Caching and Suspense

- In cached functions or components, place `cacheTag(...)` as high as it can go without changing
  behavior, near `"use cache"` and `cacheLife(...)`, so cache identity is visible with the other cache
  setup.
- Keep admin data cacheable, but do not let admin mutations serve stale data while the affected cache
  entries regenerate. Configure that behavior at the invalidation point with blocking expiration, such
  as `revalidateTag(tag, { expire: 0 })`, rather than by forcing custom cache profiles on cached loaders
  or host sites.
- For user-visible cached loaders whose result depends on `publishedAt`, `publishedAt <= now()`, or
  `Date.now()` for publishing visibility, use an hours-or-shorter cache lifetime. Do not use
  `cacheLife("days")` or `cacheLife("max")` unless the loader cannot hide future-published content or
  another mechanism guarantees timely invalidation.
- When server loaders might be called from more than one component or query path during a single page
  render, wrap the shared database or API work in `React.cache` so duplicate calls deduplicate within the
  request. Prefer primitive cache keys or stable arguments so equivalent calls hit the same cache entry.
- Do not use `<Suspense fallback={null}>`, or component APIs that silently default to a null loading
  fallback, when the fallback can be perceptibly rendered and collapsing the suspended content would
  create a visible layout problem, especially by pulling persistent headers and footers together. Use a
  height-preserving loading component or skeleton for page bodies or content sections with meaningful
  latency. A null fallback is acceptable for small fixed-size slots whose surrounding layout already
  reserves the space, work that resolves before the fallback is visibly displayed, or standalone layouts
  without surrounding chrome that would collapse into the missing content. Judge the actual surrounding
  layout and expected latency; do not add a large duplicate skeleton solely because a Suspense boundary
  covers a large subtree.

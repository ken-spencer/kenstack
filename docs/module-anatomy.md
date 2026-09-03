# Module Anatomy

Consult this reference when creating a module, adding files to one, or deciding where module code
belongs. It defines the module folder's vocabulary, what each location contains and exports, and the
canonical query pattern.

## What qualifies as a module

A module is a distinct record or settings boundary whose `index.ts` default-exports `defineModule(...)`
and whose host registers that definition in its module registry. A child module meets the same test and
is registered beneath its parent. Owning tables, UI, API handlers, or domain logic does not by itself
make a unit a module: a workflow, external adapter, subtype, or support library stays with its existing
owner until a product decision gives it an independent module lifecycle, such as its own admin
management, navigation, permissions, or list. Placement work never manufactures that lifecycle or
dissolves an existing unit to satisfy this anatomy.

## Code shared across modules

Host code that belongs to the module layer but is owned by more than one module lives under
`src/modules/shared/`, grouped by the shared domain it implements; movie fields, tables, and components
consumed by both events and video rentals live under `src/modules/shared/movie/`. `shared` is an
ownership home, not a registered module: code owned by one module stays with that module, and
application-wide or non-module code keeps its existing owner.

## The closed vocabulary

A module folder is a closed vocabulary. Every root entry is a fixed entry-surface file, a standard kind
under the kind's own name, or a named domain unit: a nested module or subsystem with its own anatomy, or
a canonical domain file. A canonical domain file earns the root only when it owns a stable domain
schema, type, or policy used across module surfaces and its concept is part of the module's top-level
vocabulary (`rules.ts` in a pricing module). Persistence, adaptation, and computation written for a
narrower consumer are support mechanisms even when their filenames are nouns; they follow the helper
ladder into their consuming kind. Unit boundaries remain product decisions: this vocabulary governs
framework-integration surfaces and support code, never the existence of domain units.

A standard kind is one kind-named file while small and the same-named folder when grown; the name
belongs to the kind at either volume, so the address never changes meaning. Custom names live inside
kind homes (`queries/comboAvailability.ts`). Support code follows the helper ladder: inline it with its
only caller; with one consuming file, keep it file-local; once multiple production consumers or a real
boundary earn it a file, place it in the applicable kind home. Only an earned helper with no listed home
goes to `lib`, and the vocabulary grows by decision.

The required core is `index.ts`, `fields` (`fields.ts` or `fields/index.ts`), and `tables.ts`. Every
other location exists only when its capability does: `client` when the module has client configuration,
`fields/formFields.ts` when a generated form map has multiple consumers, `queries` when it has a read
API, `components/` when it owns UI, and `README.md` when the gate below is met. An empty placeholder is
never created. At volume, `queries/` members keep their own names (`queries/list.ts`,
`queries/page.ts`) while the kind keeps the address.

## Entry surface (fixed names)

- `README.md` — durable module-specific contracts or boundary decisions that code and types cannot
  express and maintainers might otherwise reverse. Routine decisions, implementation history, open
  plans, and task-specific reasoning stay out.
- `index.ts` — the module definition: default-exports `defineModule({...})`, assembling the fields,
  table, admin configuration, and property-keyed `admin.fieldServers`, with implementations imported
  from the owning field units. For one-to-one kinds, import each kind-owned server config and register
  the map at `admin.oneToOne`; the parent leaves that kind's fields, table, and server behavior to the
  kind. Imported by the site's module registry.
- `client.ts` or `client.tsx` as syntax requires — default-exports the module's `defineClient(...)`
  result, a Client Component boundary (see `docs/runtime-boundaries.md`). It passes the bare isomorphic
  definitions from `fields` as `admin.fields` to `defineClient(...)` for the record schema and list
  configuration. For one-to-one kinds, import each kind-owned client config and register the map at
  `admin.oneToOne`. A settings module likewise passes bare settings fields and a `SettingsForm`; that
  form owns or imports its generated controls directly, so the client entry never imports generated
  form controls. Imported by the site's client registry aggregation.
- `fields/formFields.ts` — optional shared boundary that named-exports `fields` from one
  `defineFormFields(fields, { components?, prefix? })` call from `@kenstack/fields/formFields` over the
  isomorphic definitions and the module's property-specific client editors. Create it only when the
  same configured map has multiple production consumers; a one-use call stays in its consuming form.
  Client-owned; it never imports `client.ts(x)` or the components that consume it, so forms never import
  the client entry.
- `tables.ts` — named-exports the module's parent-owned tables and re-exports tables owned by its
  one-to-one kind units. Imported by queries, the module definition, and the site's schema registry.
  Parent-owned tables live here (`tables/` at volume); a qualifier-named sibling such as
  `stocktakeTables.ts` is misplaced. The site registers this parent entry point and never a one-to-one
  kind's table entry point directly.
- `fields.ts` / `fields/` — the primary record field configuration at the stable `./fields` address:
  one canonical field map consumed by `index.ts`, plus field-owned contracts such as form-value types,
  defaults, schemas, and named subsets. Keep the complete implementation in `fields.ts` while one file
  is sufficient. When any field owns a second file, grow the kind to `fields/`: `fields/index.ts`
  remains the isomorphic primary aggregate, defines one-file fields inline, and imports multi-file
  fields from their units. It is assembly code whose removal would lose the field map, not a barrel kept
  for path compatibility. Neither aggregate contains server behavior.

  A module-local `fields/<name>/` unit has the field-unit shape defined in
  `docs/kenstack-anatomy.md`: an isomorphic `index.ts`, with explicit server, component, schema, or
  helper files only when the field owns them. A separately implemented schema counts as a second file
  and promotes the field to a unit. Module-local and reusable fields follow the same file-count gate
  and runtime boundaries; they differ only in address and ownership.

  A module-specific name or configuration does not create a field unit. Define ordinary uses of
  Kenstack field helpers directly in `fields.ts` or `fields/index.ts`, including fields with local
  labels, defaults, validation, list settings, or filter settings. Create `fields/<name>/` only when the
  field owns a bespoke implementation such as a component, server behavior, schema module, or helper.
  One-to-one relation fields are ordinary `defineFields(...)` maps owned by their kind unit. Follow
  `docs/admin.md` for the registration contract.

  Server registrations use `admin.fieldServers`, keyed by field property name. A one-to-one kind uses
  the same `fieldServers` shape beside its table in its local `defineOneToOne(...)` config. When server
  behavior has earned a separate file, keep it in the owning field unit's `server.ts` and import it into
  the module `index.ts` registry; an assembly-only `fields/server.ts` is never added. When a second
  module needs the field contract, promote the whole field unit (definition, schema, server behavior,
  and editor) to the reusable field library. A field-specific server implementation may earn a field
  unit without changing the isomorphic field's built-in kind or adding a custom client component; the
  property-keyed `fieldServers` registration supplies that behavior.

  The client registers custom editors in `defineFormFields(...)` through its property-keyed `components`
  option, listing every property explicitly when several fields share one editor; Kenstack resolves a
  property-specific component over the built-in for that field. Keep a one-use assembly in the form
  that renders it and extract it to `fields/formFields.ts` when multiple consumers need the same
  configured map. A form never value-imports the client entry. A one-off `field(...)` belonging to a
  `defineFields(...)` property omits `kind`; `defineFields(...)` normalizes it to the property name.
  Specify a concrete kind only when the field deliberately participates in a reusable semantic
  contract; reusable `defineField(...)` factories always declare an explicit semantic kind for server
  helpers and built-in client resolution. When one normal field changes another field's visibility or
  presentation, keep both field implementations separate and coordinate them with form-level `watch()`
  or `useWatch()`.

## One-to-one kind units

A one-to-one subtype is a named domain unit inside its parent module, not a registered module and not a
member of a generic `kinds/` container. Give it the canonical subtype name at the module root, such as
`events/movie/` or `videoRentals/tvSeries/`. Keep it as a same-named file only while one file can own the
whole unit; server and client entries together earn a folder.

These kind-unit rules take precedence over the parent module's standard-kind placement rules. A file
owned specifically by the subtype, including its relation table, stays inside the kind folder; only
parent-owned files stay with the parent module. The parent `tables.ts` re-exports each kind-owned table
for schema assembly; site schema wiring imports only the parent table entry point, so a one-to-one kind
is not a separate registration surface.

- `index.ts` is server-owned and default-exports
  `defineOneToOne({ fields, table, fieldServers?, title?, translateError? })` from
  `@kenstack/admin/server`. It owns the relation table binding, server behavior, and relation-specific
  error translation. The parent module imports the config and only registers `{ movie }` or another
  canonical key in `admin.oneToOne`.
- `client.tsx` is client-owned and default-exports `defineOneToOneClient({ fields, EditForm })` from
  `@kenstack/admin/client`. It owns the relation form. The parent client imports the config and only
  registers the matching key in `admin.oneToOne`.
- Additional components, queries, policies, or helpers stay inside the kind folder. Contracts shared by
  kinds in more than one module belong under `modules/shared/<domain>/`; the local kind still owns its
  parent-specific table binding and presentation.
- Fields rendered for every kind belong to the parent field map and parent `EditForm`. A kind panel
  receives only its relation fields; common controls are never injected through parent-field props.

Canonical assembly:

```ts
// movie/index.ts
export default defineOneToOne({
  fields: movieFields,
  fieldServers: movieFieldServers,
  table: eventMovies,
});

// parent index.ts
import movie from "./movie";

defineModule({
  admin: {
    fields,
    oneToOne: { movie },
    table: events,
  },
});
```

The client follows the same ownership shape: `movie/client.tsx` exports its local
`defineOneToOneClient({ fields, EditForm })` config, and the parent `client.tsx` registers
`oneToOne: { movie }`.

## Standard kinds

- `queries.ts` / `queries/` — data access and loaders. Exports the `load*` entry functions, the
  module's server-side read API for pages, Server Components, and actions, and the result and option
  types those loaders own, which consumers import from their owner. Implementation helpers stay
  private. Follow the canonical pattern below.
- `api.ts` / `api/` — the module's HTTP surface: the route handlers and server actions it owns. A route
  serving another unit's clients belongs to that unit wherever the handler sits; string-coupled
  consumers count.
- `components/` — module-owned UI; a folder from the start, with component files keeping their own
  names. A module's bespoke admin edit form lives at `components/EditForm.tsx` and default-exports
  `EditForm`; the module path supplies the domain identity, so a qualifier is added only to distinguish
  another live form or role. Server Components by default per `docs/runtime-boundaries.md`; a
  nontrivial field's editor is the deliberate exception and stays with its field unit at
  `fields/<name>/Component.tsx`.
- `lib.ts` / `lib/` — internal helpers that pass the helper ladder in `docs/code-organization.md`.

Tests are not a module-root kind. Keep them in the owning project's configured test suite, mirroring
the module domain there: host-specific behavior in the host suite, reusable Kenstack behavior in the
Kenstack suite.

## Dependency direction

`fields.ts`, `fields/index.ts`, and each `fields/<name>/index.ts` are isomorphic; both server and client
module graphs may import them. Each `fields/<name>/server.ts` is server-owned, imports `"server-only"`,
and imports only the server or isomorphic siblings it needs. Each `fields/<name>/Component.tsx` is
client-owned and may import its field's isomorphic entry point. `index.ts`, `tables`, `queries`, and
`api` are server-owned; a generated form-map owner and `client.ts` start with `"use client"` and import
only isomorphic definitions and client-owned code. A one-to-one kind's `index.ts` is server-owned and
its `client.tsx` is client-owned. The parent `index.ts` registers server implementations through
property-keyed `fieldServers`; the consuming form or shared `fields/formFields.ts` registers client
implementations through `defineFormFields(...)`; `client.ts` passes the bare isomorphic field map to
`defineClient(...)` and never imports the generated components. `fields/index.ts` only assembles
isomorphic field entries. `index.ts` and `client.ts` do not import one another: the host registries
assemble the server definition and client loader without pulling either runtime graph through the
other.

## Host registration

Add only the registrations the module's capabilities require:

- Export its tables from the host schema registry and add its default `index.ts` export to the module
  registry. Register a child module beneath its parent, preserving that product boundary.
- When `client.ts` exists, add it to the host client registry through a lazy `() => import(...)`
  loader, keeping that registry's required Client Component boundary. Register custom editors by
  property through `defineFormFields(...)` in their consuming form, extracting a shared
  `fields/formFields.ts` only for multiple consumers. Pass the bare isomorphic field map to
  `defineClient(...)` as `admin.fields`. A bespoke module form may still import a component directly
  when it needs module-specific context or coordinates several fields. Isomorphic field definitions
  never import or load components.
- When module `api` code handles HTTP, expose it through a thin `app/**/route.ts` entry, because
  Next.js discovers Route Handlers only inside the App Router. The route delegates or re-exports the
  method while the module retains the implementation.

## Growing a standard kind

Replace a singleton kind file with its same-named folder only when multiple sibling implementations
justify the folder. Relocate the canonical implementation, update consumers directly, and remove the old
file, leaving neither a compatibility barrel for the old path nor simultaneous file and folder
implementations.

## Canonical public query patterns

Publication-owned, cacheable reads follow one shape. The cache wrapper is for content whose staleness
the module's invalidation tags bound. Before caching, account for volatile joined values (live
availability, counts), time-dependent visibility, and data joined from other modules: a loader with
volatile parts stays uncached, uses a shorter `cacheLife` matched to real staleness tolerance, or splits
the volatile part into its own uncached read, because stale data served as fresh is worse than an
uncached query.

Use the table-driven query pair: `listQuery(...)` for collections and `pageQuery(...)` for one public
page row. They own deletion, publication, and configured SEO behavior; module authors do not
reconstruct it around them.

### Cached lists

```ts
import "server-only";

import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { listQuery, resolveListDraft } from "@kenstack/db/queries";
import { faq } from "./tables";

export async function loadFaqList() {
  return loadCachedFaqList(await resolveListDraft());
}

async function loadCachedFaqList(draft: boolean) {
  "use cache: remote";
  cacheTag("faq");

  const [rows, publicationCacheLife] = await listQuery(faq, {
    draft,
    select: { id: faq.id, title: faq.title, slug: faq.slug },
    orderBy: [asc(faq.sortOrder), asc(faq.id)],
  });

  cacheLife(publicationCacheLife ?? "max");

  return rows;
}
```

The rules the shape encodes:

- A query module that accesses the database, secrets, or other server dependencies imports
  `"server-only"` so an accidental Client Component import fails at build time.
- The exported entry calls `resolveListDraft()`, which reads Draft Mode and requires an admin when
  Draft Mode is enabled, then passes only the serializable boolean into the private cached function.
  Callers never read or pass Draft Mode themselves.
- One cached function serves public and draft visibility. Next.js reexecutes cached functions and
  discards their results during a Draft Mode request, so a separate draft query only duplicates the
  list implementation.
- A loader whose contract must remain public during Draft Mode passes `draft: false` directly and can
  keep the cache directive on its exported function. Use this for purchase options and other public
  choice lists, which an admin preview cookie must never change; the command still validates a
  submitted choice against authoritative uncached state.
- The cache wrapper tags the cache with the module's `revalidate` tags plus every joined dependency
  whose changes can alter the result. A dependency with no reliable invalidation tag stays uncached or
  is split from the cached content. Filtered lists may add parameterized tags, for example
  `cacheTag("news", "news:tag:" + tag)`, but these enable narrow invalidation only for mutation paths
  that invalidate the narrow tag alone; standard module saves invalidate the broad module tag, and with
  it every entry.
- `listQuery(...)` owns the row query and the earliest-future-publication query. It applies the same
  table, publication time, optional `innerJoin(...)` calls, and optional `where` predicate to both,
  applies visibility before row ordering and limits, and returns the rows with an inline cache profile
  or `undefined`. The cached function still calls `cacheLife(publicationCacheLife ?? "max")` itself so
  cache policy stays beside `"use cache"`.
- For a filtered cached variant, build its SQL predicate inside the cached function from serializable
  arguments and pass it once as `where`; a Drizzle `SQL` object never crosses the cache boundary. Use
  `joins` when an inner join is required and keep the related predicate in `where`. The joined
  relationship must preserve one result row per listed record; otherwise use a correlated `exists(...)`
  predicate. Keep one-use predicates inline. Joined dependency changes still require their ordinary
  cache tags, and a joined publishable table's schedule needs its own cache-lifetime treatment.
- Queries with live availability, inventory, or another time boundary keep their own cache policy.

### Cached detail pages

A detail page has a different cache shape. Cache the non-deleted row without applying its
time-dependent publication status in SQL. Select `visibility` and `publishedAt` with the content, then
pass the cached result to `resolveVisiblePage(row)`. The record can use `cacheLife("max")` because
publication changes only the request-time decision; ordinary tags refresh its content, deletion, slug,
visibility, and schedule.

```ts
import "server-only";

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { pageQuery, resolveVisiblePage } from "@kenstack/db/queries";
import { faq } from "./tables";

export async function loadFaqPage(slug: string) {
  return resolveVisiblePage(await loadCachedRow(slug));
}

async function loadCachedRow(slug: string) {
  "use cache: remote";
  cacheLife("max");
  cacheTag("faq", `faq:${slug}`);

  return pageQuery(faq, {
    select: {
      id: faq.id,
      slug: faq.slug,
      title: faq.title,
    },
    where: eq(faq.slug, slug),
  });
}
```

The detail rules:

- Keep two boundaries: the exported request-time loader and the private cached row query. Call
  `pageQuery(...)` directly in the cached function. It always excludes deleted rows and selects
  `visibility` and `publishedAt`; for `seo: true` tables it also selects the SEO fields and resolved OG
  image configured by `defineTable(...)`. Add a third uncached query helper only when another
  production path calls it, such as an authoritative or draft read.
- `resolveVisiblePage(row)` reads the current request's Draft Mode state, owns the complete gate, and
  returns the same row or `null`. In Draft Mode it requires an admin and accepts any non-null row. For a
  public request it owns the current date, includes `unlisted`, excludes `draft`, and returns
  `published` once its publication time arrives. Pass `{ draft: false }` only when a current caller
  deliberately requires public visibility during a Draft Mode request.
- Resolve the cached row before applying the helper. The row cache is shared and contains no
  authorization state; the helper's authorization and visibility decision runs outside it before any
  row is returned.
- The helper owns the clock, and the awaited row read is already the request-time suspension point;
  callers pass no `new Date()` and add no `io()`.
- This avoids a list/detail race: a scheduled list can expose its new link at publication time while
  the linked detail route would otherwise keep serving a separately cached pre-publication `null` as a
  false 404.
- For an uncached direct public-record check, pass the `pageQuery(...)` result to
  `resolveVisiblePage(..., { draft: false })`.

### Route metadata

The Next.js route owns `generateMetadata`; the module query owns the reusable page data. Call the same
detail loader the page uses so metadata and page rendering share visibility, Draft Mode, and caching
behavior.

```ts
// app/faq/[slug]/page.tsx
import { buildMetadata } from "@kenstack/admin/metadata";

import { loadFaqPage } from "@/modules/faq/queries/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return buildMetadata(await loadFaqPage(slug));
}
```

Keep route-specific title, image, and robots mapping in that function when `buildMetadata(...)` does not
express it. Extract a metadata builder only when it owns substantial reusable domain policy or has
multiple production consumers; a module `loadFaqPageMetadata` wrapper or generic callback factory that
only relocates these route-owned lines into `queries/metadata.ts` is neither.

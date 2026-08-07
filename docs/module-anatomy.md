# Module Anatomy

Consult this reference when creating a module, adding files to one, or deciding where module code
belongs. It defines the module folder's vocabulary, what each location contains and exports, and the
canonical query pattern.

## What qualifies as a module

A module is a distinct record or settings boundary whose `index.ts` default-exports `defineModule(...)`
and whose host registers that definition in its module registry. A child module meets the same test and
is registered beneath its parent. Owning tables, UI, API handlers, or domain logic does not by itself
make a unit a module: a workflow, external adapter, subtype, or support library stays with its existing
owner unless a product decision gives it an independent module lifecycle, such as its own admin
management, navigation, permissions, or list. Placement work must not manufacture that lifecycle or
dissolve an existing unit merely to satisfy this anatomy.

## Code shared across modules

Host code that belongs to the module layer but is owned by more than one module lives under
`src/modules/shared/`, grouped by the shared domain it implements. For example, movie fields, tables,
and components consumed by both events and video rentals live under `src/modules/shared/movie/`.
`shared` is an ownership home, not a registered module: code owned by only one module stays with that
module, and application-wide or non-module code keeps its existing owner.

## The closed vocabulary

A module folder is a closed vocabulary, not a grab bag. Every root entry is a fixed entry-surface
file, a standard kind under the kind's own name, or a named domain unit — a nested module or subsystem
with its own anatomy, or a canonical domain file. A canonical domain file earns the root only when it
owns a stable domain schema, type, or policy used across module surfaces and its concept is part of the
module's top-level vocabulary (`rules.ts` in a pricing module). Persistence, adaptation, and computation
written for a narrower consumer are support mechanisms even when their filenames are nouns; they follow
the helper ladder into their consuming kind. Unit boundaries remain product decisions: this vocabulary
governs framework-integration surfaces and support code, never the existence of domain units.

Standard kinds are one kind-named file while small and the same-named folder when grown; the name
belongs to the kind at either volume, so the address never changes meaning. Custom names live inside
kind homes (`queries/comboAvailability.ts`), never loose at root. Support code first follows the helper
ladder: inline it with its only caller; with one consuming file, keep it file-local; after multiple
production consumers or a real boundary earn it a file, place it in the applicable kind home. Only an
earned helper with no listed home goes to `lib`, and the vocabulary grows by decision, not accretion.

The required core is `index.ts`, `fields` (`fields.ts` or `fields/index.ts`), and `tables.ts`. Every
other location exists only when its capability does: `client` when the module has client configuration,
`fields/formFields.ts` when a generated form map has multiple consumers, `queries` when it has a read
API, `components/` when it owns UI, and `README.md` when the gate below is met. Never create empty
placeholders. At volume, `queries/` members keep their own names — `queries/list.ts`, `queries/page.ts`,
`queries/metadata.ts` — while the kind keeps the address.

## Entry surface (fixed names)

- `README.md` — durable module-specific contracts or boundary decisions that code and types cannot
  express and maintainers might otherwise reverse. Do not record routine decisions, implementation
  history, open plans, or task-specific reasoning.
- `index.ts` — the module definition: default-exports `defineModule({...})`, assembling the fields,
  table, admin configuration, and property-keyed `admin.fieldServers`; import implementations from the
  owning field units. For one-to-one kinds, import each kind-owned server config and register the map at
  `admin.oneToOne`; the parent does not restate its fields, table, or server behavior. Imported by the
  site's module registry.
- `client.ts` or `client.tsx` as syntax requires — default-exports the module's `defineClient(...)`
  result (a Client Component boundary; see `docs/runtime-boundaries.md`). It passes the bare isomorphic
  definitions from `fields` as `admin.fields` to `defineClient(...)` for the record schema and list
  configuration. For one-to-one kinds, import each kind-owned client config and register the map at
  `admin.oneToOne`. A settings module likewise passes bare settings fields and a `SettingsForm`; that
  form owns or imports its generated controls directly. The client entry never imports generated form
  controls. Imported by the site's client registry aggregation.
- `fields/formFields.ts` — optional shared boundary that named-exports `fields` from one
  `defineFormFields(fields, { components?, prefix? })` call from `@kenstack/fields/formFields` over the
  isomorphic definitions and the module's property-specific client editors. Create it only when the
  same configured map has multiple production consumers; keep a one-use call in its consuming form.
  Client-owned; it never imports `client.ts(x)` or the components that consume it, so forms never need
  to import the client entry.
- `tables.ts` — named-exports the module's parent-owned tables and re-exports tables owned by its
  one-to-one kind units. Imported by queries, the module definition, and the site's schema registry.
  Parent-owned tables live here (`tables/` at volume); a qualifier-named sibling such as
  `stocktakeTables.ts` is misplaced. The site registers this parent entry point and never registers a
  one-to-one kind's table entry point directly.
- `fields.ts` / `fields/` — the primary record field configuration at the stable `./fields` address:
  one canonical field map consumed by `index.ts`, plus field-owned contracts such as form-value types,
  defaults, schemas, and named subsets. Keep the complete implementation in `fields.ts` while one file
  is sufficient. When any field owns a second file, grow the kind to `fields/`: `fields/index.ts`
  remains the isomorphic primary aggregate, defines one-file fields inline, and imports multi-file
  fields from their units. It is assembly code whose removal would lose the field map, not a barrel
  retained for path compatibility. Neither aggregate contains server behavior.

  A module-local `fields/<name>/` unit has the field-unit shape defined in
  `docs/kenstack-anatomy.md`: an isomorphic `index.ts`, with explicit server, component, schema, or
  helper files only when the field owns them. A separately implemented schema counts as a second file
  and therefore promotes the field to a unit. Module-local fields and reusable fields follow the same
  file-count gate and runtime boundaries; they differ only in address and ownership.

  A module-specific name or configuration does not create a field unit. Define ordinary uses of
  Kenstack field helpers directly in `fields.ts` or `fields/index.ts`, including fields with local
  labels, defaults, validation, list settings, or filter settings. Create `fields/<name>/` only when the
  field owns a bespoke implementation such as a component, server behavior, schema module, or helper.
  One-to-one relation fields are ordinary `defineFields(...)` maps owned by their kind unit. Follow
  `docs/admin.md` for the registration contract.

  Server registrations use `admin.fieldServers`, keyed by field property name. A one-to-one kind uses
  the same `fieldServers` shape beside its table in its local `defineOneToOne(...)` config. When
  server behavior has earned a separate file, keep it in the owning field unit's `server.ts` and import
  it into the module `index.ts` registry. Do not add an assembly-only `fields/server.ts`. When a second
  module needs the field contract, promote the whole field unit — definition, schema, server behavior,
  and editor — to the reusable field library rather than promoting fragments independently. A
  field-specific server implementation may earn a field unit without changing the isomorphic field's
  built-in kind or adding a custom client component; the property-keyed `fieldServers` registration
  supplies that behavior.

  The client registers custom editors in `defineFormFields(...)` through its property-keyed `components`
  option. List every property explicitly when several fields share one editor. Kenstack resolves a
  property-specific component over the built-in for that field. Keep a one-use assembly in the form
  that renders it; extract it to `fields/formFields.ts` when multiple consumers need the same configured
  map. Never value-import the client entry from a form. A one-off `field(...)` belonging to a
  `defineFields(...)` property always omits `kind`; `defineFields(...)` normalizes it to the property
  name. Specify a concrete kind only when the field deliberately participates in a reusable semantic
  contract. Reusable `defineField(...)` factories always declare an explicit semantic kind for server
  helpers and built-in client resolution.
  When one normal field changes another field's visibility or presentation, keep both field
  implementations separate and coordinate them with form-level `watch()` or `useWatch()`.

## One-to-one kind units

A one-to-one subtype is a named domain unit inside its parent module, not a registered module and not a
member of a generic `kinds/` container. Give it the canonical subtype name at the module root, such as
`events/movie/` or `videoRentals/tvSeries/`. Keep it as a same-named file only when one file can own the
whole unit; server and client entries together earn a folder.

These kind-unit rules take precedence over the parent module's standard-kind placement rules. A file
owned specifically by the subtype, including its relation table, stays inside the kind folder; only
parent-owned files stay with the parent module. The parent `tables.ts` re-exports each kind-owned table
for schema assembly. Site schema wiring imports only the parent table entry point; a one-to-one kind is
not a separate registration surface.

- `index.ts` is server-owned and default-exports
  `defineOneToOne({ fields, table, fieldServers?, title?, translateError? })` from
  `@kenstack/admin/server`. It owns the relation table binding, server behavior, and relation-specific
  error translation. The parent module imports the config and only registers
  `{ movie }` or another canonical key in `admin.oneToOne`.
- `client.tsx` is client-owned and default-exports `defineOneToOneClient({ fields, EditForm })` from
  `@kenstack/admin/client`. It owns the relation form. The parent client imports the config and only
  registers the matching key in `admin.oneToOne`.
- Additional components, queries, policies, or helpers stay inside the kind folder. Contracts shared by
  kinds in more than one module belong under `modules/shared/<domain>/`; the local kind still owns its
  parent-specific table binding and presentation.
- Fields rendered for every kind belong to the parent field map and parent `EditForm`. A kind panel
  receives only its relation fields and must not accept parent-field injection props merely to place
  common controls.

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

- `queries.ts` / `queries/` — data access and loaders. Exports the `load*` entry functions — the
  module's server-side read API for pages, Server Components, and actions — and the types those loaders
  own (result and option types consumers import from their owner). Implementation helpers stay private.
  Follow the canonical pattern below.
- `api.ts` / `api/` — the module's HTTP surface: the route handlers and server actions it owns. A
  route serving another unit's clients belongs to that unit wherever the handler sits — string-coupled
  consumers count.
- `components/` — module-owned UI; a folder from the start, and component files keep their own names.
  A module's bespoke admin edit form lives at `components/EditForm.tsx` and default-exports `EditForm`;
  the module path supplies the domain identity, so add a qualifier only when it distinguishes another
  live form or role.
  Server Components by default per `docs/runtime-boundaries.md`. A nontrivial field's editor is the
  deliberate exception and stays with its field unit at `fields/<name>/Component.tsx`.
- `lib.ts` / `lib/` — internal helpers that pass the helper ladder in `docs/code-organization.md`.

Tests are not a module-root kind. Keep them in the owning project's configured test suite, mirroring the
module domain there; host-specific behavior belongs to the host suite, while reusable Kenstack behavior
belongs to the Kenstack suite.

## Dependency direction

`fields.ts`, `fields/index.ts`, and each `fields/<name>/index.ts` are isomorphic; both server and client
module graphs may import them. Each `fields/<name>/server.ts` is server-owned, imports `"server-only"`,
and imports only the server or isomorphic siblings it needs. Each
`fields/<name>/Component.tsx` is client-owned and may import its field's isomorphic entry point.
`index.ts`, `tables`, `queries`, and `api` are server-owned; a generated form-map owner and `client.ts`
start with `"use client"` and import only isomorphic definitions and client-owned code. A one-to-one
kind's `index.ts` is server-owned and its `client.tsx` is client-owned. The parent `index.ts`
registers server implementations through property-keyed `fieldServers`; the consuming form or shared
`fields/formFields.ts` registers client implementations through `defineFormFields(...)`; `client.ts`
passes the bare isomorphic field map to `defineClient(...)` and never imports the generated components.
`fields/index.ts` only assembles isomorphic field entries. `index.ts`
and `client.ts` do not import one another: the host registries assemble the server definition and client
loader without pulling either runtime graph through the other.

## Host registration

Add only the registrations required by the module's capabilities:

- Export its tables from the host schema registry and add its default `index.ts` export to the module
  registry. Register a child module beneath its parent; do not flatten that product boundary.
- When `client.ts` exists, add it to the host client registry through a lazy `() => import(...)` loader;
  keep that registry's required Client Component boundary. Register custom editors by property through
  `defineFormFields(...)` in their consuming form, extracting a shared `fields/formFields.ts` only for
  multiple consumers. Pass the bare isomorphic field map to `defineClient(...)` as `admin.fields`.
  Bespoke module forms may still import a component directly when it needs module-specific context or
  coordinates several fields. Isomorphic field definitions never import or load components.
- When module `api` code handles HTTP, expose it through a thin `app/**/route.ts` entry because Next.js
  discovers Route Handlers only inside the App Router. The route delegates or re-exports the method while
  the module retains the implementation.

## Growing a standard kind

Replace a singleton kind file with its same-named folder only when multiple sibling implementations
justify the folder. Relocate the canonical implementation, update consumers directly, and remove the old
file; do not leave a compatibility barrel merely to preserve its path or keep simultaneous file and
folder implementations.

## The canonical query pattern

Publication-owned, cacheable reads follow one shape. The cache wrapper is for content whose staleness
the module's invalidation tags actually bound — before caching, account for volatile joined values
(live availability, counts), time-dependent visibility, and data joined from other modules. A loader
with volatile parts keeps the draft split but caches nothing, uses a shorter `cacheLife` matched to
real staleness tolerance, or splits the volatile part into its own uncached read: stale data served as
fresh is worse than an uncached query.

```ts
import "server-only";

import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { listWhere } from "@kenstack/admin/queries";
import { deps } from "@app/deps";
import { faq } from "./tables";

type LoadFaqListOptions = {
  draft?: boolean;
};

export async function loadFaqList(options: LoadFaqListOptions = {}) {
  const { draft = false } = options;

  if (!draft) {
    return loadCachedRows();
  }

  return loadRows({ draft });
}

async function loadCachedRows() {
  "use cache";
  cacheLife("hours");
  cacheTag("faq");

  return loadRows();
}

async function loadRows({ draft = false }: LoadFaqListOptions = {}) {
  const visibility = await listWhere(faq, { draft });

  return deps.db
    .select({ id: faq.id, title: faq.title, slug: faq.slug })
    .from(faq)
    .where(visibility)
    .orderBy(asc(faq.sortOrder), asc(faq.id));
}
```

The rules the shape encodes:

- A query module that accesses the database, secrets, or other server dependencies imports
  `"server-only"` so an accidental Client Component import fails at build time.
- The exported entry takes an options object with `draft?: boolean` defaulting to `false`, plus the
  loader's real filters. Keep a reused private options type beside its loader, as in the example; export
  it only when a consumer needs that contract. Keep genuinely one-off select shapes local.
- Draft content is never cached. The non-draft path delegates to a private `"use cache"` wrapper; the
  draft path queries directly.
- The cache wrapper sets `cacheLife` and tags the cache with the module's `revalidate` tags plus every
  joined dependency whose changes can alter the result. If a dependency has no reliable invalidation
  tag, leave that read uncached or split it from the cached content. Filtered lists may add parameterized
  tags — for example `cacheTag("news", "news:tag:" + tag)` — but these enable narrow invalidation only
  for mutation paths that invalidate the narrow tag alone; standard module saves invalidate the broad
  module tag, and with it every entry.
- One private `loadRows` performs the query for both paths. Cached and uncached results cannot drift,
  because they come from the same function.
- Visibility comes from `listWhere(table, { draft })` for collections and
  `pageWhere(table, { draft })` for direct/detail lookups, where unlisted records remain reachable by
  URL. Never hand-roll published/draft predicates.

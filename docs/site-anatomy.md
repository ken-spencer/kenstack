# Site Anatomy

Consult this reference when creating or placing host-site code. It describes the shared host layout
demonstrated by Civic Theatre and Agate Springs; a site creates only the containers required by its
capabilities. Inside a registered module, `docs/module-anatomy.md` takes precedence.

## Container test

Choose a container by the unit's lifecycle, not by the vocabulary of one implementation:

- `modules/` — registered `defineModule(...)` record or settings boundaries. Registration and module
  lifecycle are the qualification test; follow `docs/module-anatomy.md` inside each module.
- `features/` — non-module domain systems with their own workflow or lifecycle, such as ticket buying or
  point of sale. A feature may use modules without becoming one.
- `integrations/` — adapters owned by an external service or protocol. Keep service-specific mapping,
  synchronization, and transport here; domain records remain with their domain owner.
- A named top-level domain — only for a stable site-wide concept used across several containers and not
  owned by one of them. Its name must describe the domain, not an implementation kind.

Containers are capability-gated. A site without `features/` or `integrations/` is complete, not behind.
Do not establish a generic top-level container for subtypes or “kinds”; keep a subtype with the domain
whose behavior it specializes until a product decision gives it an independent lifecycle. Existing
unsupported top-level directories are transitional and do not establish precedent.

## Framework and shared areas

- `app/` — Next.js routes, layouts, and framework-discovered entry points. Treat it as an entry-point
  layer: dependencies flow into it, and code outside `app/` must not import from it. Keep small
  route-only presentation inline, but place substantial UI, logic, queries, and reusable contracts
  with their owning module, feature, integration, or site-wide domain. A substantial product surface
  without another owner may earn a named feature rather than becoming a dependency under `app/` or
  generic `components/`.
- `components/` — domain-neutral, site-wide UI with multiple consumers and no narrower owner. Do not
  place module-owned UI here merely because it has consumers outside that module or is shared by
  multiple modules. Keep single-module domain UI in that module's `components/`; keep domain UI shared
  across modules under `modules/shared/<domain>/`. See `docs/module-anatomy.md`.
- `deps/` — the host implementations of Kenstack's dependency contracts.
- `email/` — site-wide email presentation or delivery composition not owned by a narrower domain.
- `lib/` — cross-site helpers that pass the helper ladder in `docs/code-organization.md` and have no
  narrower owner.
- Static content or data areas — allowed only when the site intentionally owns that content source;
  name the domain rather than the storage format.

## Host wiring

- `modules/index.ts` registers site modules; nested modules remain beneath their owning module.
- `modules/clients.ts` assembles module client registries through lazy client-safe loaders when the site
  has client module configuration.
- `db/tables.ts` exports Kenstack tables, feature and integration table entry points, and registered
  parent-module table entry points for the database schema registry. It does not import nested
  one-to-one table entry points; their parent modules re-export them. `db/setup.ts` is the site's single
  database-setup executable.
- `deps/` supplies the explicit host implementations consumed through `@app/deps`.
- `app/**/route.ts` exposes module, feature, or integration HTTP behavior only where Next.js requires a
  framework entry point.

These files wire owners together; they do not take ownership of the definitions they import.

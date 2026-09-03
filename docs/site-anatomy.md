# Site Anatomy

Consult this reference when creating or placing host-site code. It describes the shared host layout
demonstrated by Civic Theatre and Agate Springs; a site creates only the containers its capabilities
require. Inside a registered module, `docs/module-anatomy.md` takes precedence.

## Container test

Choose a container by the unit's lifecycle, not by the vocabulary of one implementation:

- `modules/` — registered `defineModule(...)` record or settings boundaries. Registration and module
  lifecycle are the qualification test; follow `docs/module-anatomy.md` inside each module.
- `features/` — non-module domain systems with their own workflow or lifecycle, such as ticket buying or
  point of sale. A feature may use modules without becoming one.
- `integrations/` — adapters owned by an external service or protocol. Keep service-specific mapping,
  synchronization, and transport here; domain records remain with their domain owner.
- A named top-level domain — only for a stable site-wide concept used across several containers and not
  owned by one of them. Its name describes the domain, not an implementation kind.

Containers are capability-gated. A site without `features/` or `integrations/` is complete, not behind.
A subtype stays with the domain whose behavior it specializes until a product decision gives it an
independent lifecycle; there is no generic top-level container for subtypes or “kinds”. Existing
unsupported top-level directories are transitional and set no precedent.

## Framework and shared areas

- `app/` — Next.js routes, layouts, and framework-discovered entry points. It is an entry-point layer:
  dependencies flow into it, and code outside `app/` never imports from it. Keep small route-only
  presentation inline; substantial UI, logic, queries, and reusable contracts live with their owning
  module, feature, integration, or site-wide domain. A substantial product surface without another
  owner may earn a named feature; it does not become a dependency under `app/` or generic
  `components/`.
- `components/` — domain-neutral, site-wide UI with multiple consumers and no narrower owner.
  Single-module domain UI stays in that module's `components/`, and domain UI shared across modules
  lives under `modules/shared/<domain>/` (see `docs/module-anatomy.md`), whatever the number of
  consumers outside the module.
- `email/` — site-wide email presentation or delivery composition not owned by a narrower domain. Its
  entry point supplies the narrow `@app/email` binding when Kenstack needs host presentation or sender
  configuration.
- `lib/` — cross-site helpers that pass the helper ladder in `docs/code-organization.md` and have no
  narrower owner.
- Static content or data areas — only when the site intentionally owns that content source; name the
  domain, not the storage format.

## Host wiring

- `modules/index.ts` registers site modules; nested modules remain beneath their owning module.
- `modules/clients.ts` assembles module client registries through lazy client-safe loaders when the site
  has client module configuration.
- `db/tables.ts` exports Kenstack tables, feature and integration table entry points, and registered
  parent-module table entry points for the database schema registry; parent modules re-export their
  nested one-to-one table entry points, so it imports none directly. `db/setup.ts` is the site's single
  database-setup executable. `db/index.ts` creates the schema-aware database with
  `createDb({ schema: tables })` and supplies the `@app/db` binding; query modules import that owner
  directly.
- `modules/index.ts`, `email/index.ts`, and `roles.ts` supply the `@app/modules`, `@app/email`, and
  `@app/roles` bindings. These are compile-time path bindings, not a runtime dependency container.
- `app/**/route.ts` exposes module, feature, or integration HTTP behavior only where Next.js requires a
  framework entry point.

These files wire owners together; they do not take ownership of the definitions they import.

## Shared component themes

Kenstack component styles provide usable defaults and the shared component contract. A host that keeps
that contract loads `@kenstack/theme.css` before its own theme and extends it with later rules. Shared
styles own component structure and the mechanics of interaction, focus, disabled states, and icons. The
host theme owns its visual identity, including dimensions, typography, colours, borders, radius, motion,
and host-only variants.

Keep host overrides to the visual decisions the host intends to preserve; where the host accepts the
shared value, the Kenstack declaration stays in Kenstack, so fixes to shared mechanics reach the host
without making its visual design depend on incidental Kenstack defaults. Use host wrappers around
Kenstack components for site-wide variants; feature-specific controls stay with their feature until
they become a reusable site pattern.

A host that replaces a component's complete presentation imports the required leaf styles in place of
the aggregate theme and owns the omitted class contract in full, including every variant, size,
interaction state, and accessibility treatment. Omitting `@kenstack/components/button.css` also means
owning the `.link` utility and class. Loading the aggregate theme and then neutralizing nearly every
declaration from one of its leaves is the wrong shape.

Kenstack may improve shared mechanics without requiring hosts to copy those changes. Changes to an
established visual default stay conservative; a material change requires an upgrade note so a host can
decide whether to accept or override it.

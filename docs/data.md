# Data Reference

Consult this reference for databases, Drizzle, table schemas, Zod, validation, record persistence,
pipeline schema work, or batch scripts.

## Database

- During development, generate and apply additional migrations as schema work evolves. Before
  committing, compress every migration from that uncommitted work into one consolidated migration; a
  commit introduces only that one, so a later fix from the same commit updates or regenerates the
  private migration.
- Leave generated files under `drizzle/` exactly as Drizzle emits them and review the generated SQL
  diff directly; the formatter runs only on handwritten schema and source files.
- A Drizzle migration never durably owns a database object or invariant the Drizzle schema cannot
  express, such as an extension, exclusion constraint, trigger, function, or grant, because host
  migration history may be consolidated and host code may move without its old chain. Keep an
  idempotent installer beside the module that owns the invariant and register it with the site's single
  database-setup executable, which calls ordinary module installer functions. Run that executable after
  every successful `drizzle-kit migrate`; its failure fails `db:migrate`.
- Check existing migrations before changing a schema or column name.
- Import reusable site-side database read helpers from `@kenstack/db/queries`, which owns standard
  public visibility predicates, request-time detail visibility, scheduled-list cache timing, and media
  select expressions. Schema objects and table builders live under `@kenstack/db/tables`; a table
  barrel carries no query expressions, even for a shared table.

### Migration history

- Append by default. Once Preview, staging, or production has recorded a migration, preserve its SQL,
  snapshot, and journal entry exactly.
- Rebase private history only after checking every database ledger and defining how each database
  reaches the replacement chain. When in doubt, append.
- A development database may have consumed intermediate private migrations before they were compressed,
  so the consolidated migration cannot simply replay against it. Reset the database when it is
  disposable; otherwise compare its schema with the consolidated target and reconcile both the missing
  schema changes and its migration ledger through a separately authorized operation before running the
  normal migration command again.
- If a shared Preview, staging, or production database consumed rewritten history, stop deployment,
  restore the last shared artifacts, and reconcile its schema and ledger only through a separately
  authorized operation.
- Resetting, rebasing, squashing, or regenerating migration files never authorizes changing a database.
  A destructive database operation requires a separate request naming the exact database and operation.
- Changes required by every database go in the migration chain. Reserve direct queries for simple
  changes to one identified development database and scripts for complex or repeatable reconciliation.

### Tables and fields

- Use `defineTable` flags for standard capabilities: `reorder: true` for `sortOrder` and its
  active-record index, `publish: true` for `visibility`/`publishedAt` and their active-record composite
  index, and `seo: true` for `seoTitle`/`seoDescription`/`ogImage`. Hand-add those bundles or indexes
  only when the table intentionally needs a custom shape.
- Use Kenstack's table helpers for standard relationship tables: `defineTags({ table, prefix })` from
  `@kenstack/db/tables/tags` builds a tag relation table with its `tableId`/`tagId`/`createdAt` columns
  and indexes.
- Define field maps with isomorphic `defineFields({ publish: true, seo: true, fields: { ... } })` from
  `@kenstack/admin/fields`, keeping field-set options on that wrapper.
- Kenstack field factories own field helper internals such as `__kenstackField`. Site modules use
  `field(...)` for custom field values or a convenience helper such as `textField(...)`,
  `dateField(...)`, or `tagField(...)` for standard inputs.
- In field definitions, state an option only when it changes behavior or clarifies a non-obvious
  exception; defaults such as `searchable: false` and `revisions: true` stay unstated.
- Derive schema-aware and table-aware types from the schema or table. Select with `.select({ ... })`
  naming the exact columns or expressions the caller reads, so query cost and TypeScript inference stay
  visible. A full-row `.select()` is for code that consumes the full row as the domain object or for an
  extension point such as field lifecycle hooks or revalidation callbacks; for an extension point, add a
  short nearby comment naming that boundary.

## Embedded IDs

- For stable identity inside a small, non-secret JSONB collection, reuse an existing durable domain key
  when one uniquely identifies the entry; otherwise use `unsecureId()` from `@kenstack/lib/unsecureId`
  in place of `crypto.randomUUID()`, array indexes, or a new generator.
- `unsecureId()` is for non-secret identifiers only. Authentication, password-reset, session, and other
  bearer tokens keep the generator and storage owned by their authentication flow.

## Record saves

- When a form updates an existing record through `saveRecord`, submit its top-level dirty field names
  as `changes`, validate them against the action's values schema, and pass them through; a custom form
  or action boundary that drops `changes` saves every submitted field. Full-field saves are for inserts
  and deliberate upserts.
- A successful insert ends the browser form's new-entry transaction; the centralized reset rule in
  `docs/forms.md#form-state` owns clearing the completed record.
- For child-collection persistence, load current rows, preserve stable IDs, insert only records marked
  new, update only rows whose values changed, and remove only rows marked for removal. Durable row IDs
  matter most where sales, tickets, audit rows, schedules, or future integrations may reference them.
- Mark editable collection rows with explicit client markers such as `isNew` and `isRemoved`. The UI
  keeps a removed row in form state and hides it, so an omitted row never implies removal.

## Validation

- Treat route parameters, query strings, request bodies, and form submissions as untrusted input
  boundaries. Parse each server boundary once with a Zod schema owned by the route or pipeline, then
  pass its validated output to internal code. A client form may own a schema for its raw fields; that
  browser-side validation does not replace the server action's schema.
- Discard an invalid optional query parameter when it only selects, filters, or restores interface
  state, expressing the fallback in the schema with `.optional().catch(undefined)` or the appropriate
  neutral value so malformed and repeated values neither throw nor produce an error page. Required
  identifiers and action-bearing inputs keep the route's explicit `400` or `404` behavior.
- Check the installed Zod version and current documentation before using version-sensitive APIs. Use
  Zod 4 top-level string formats such as `z.url()`, `z.email()`, and `z.iso.date()`; the chained forms
  are deprecated.
- Keep schemas direct. Use `.pipe()` only when a transform's output needs validation by another schema
  or no simpler chain expresses the same behavior.
- Normalize accepted input at its owning schema with transforms such as `.trim()`, `.toLowerCase()`, or
  `.toUpperCase()` when downstream code should receive the normalized value.
- Use Zod's direct string message syntax where supported: `.refine(check, "Message")` and
  `.min(1, "Message")`.
- Pass the schema to `pipelineStage({ schema })` and make it produce the validated, normalized shape the
  action needs: request-field transforms, defaults, refinements, and derived request values belong in
  that schema. When a handler needs a different shape, give the stage an action-specific schema built
  with `.transform(...)` or `.pipe(...)`.
- Parse each value once. Before adding `.parse(...)` or `.safeParse(...)`, trace the boundary that
  produced the value; when a route, pipeline stage, admin field schema, field lifecycle, or prior helper
  already parsed it, consume that output type. This includes pipeline actions and field save, load, and
  display behavior, which receive validated values and keep any necessary cast narrow at the untyped
  lifecycle boundary. Manual parsing inside a pipeline action is reserved for data outside the
  submitted payload, a truly external or untyped boundary, or a schema that depends on context the
  action loads; keep that exception narrow and state the reason in the surrounding code.
- When a client form needs raw input values and the server action needs normalized values, keep the
  client form schema focused on form input and derive a separate server or action schema from it for
  the pipeline stage, so the action never reparses the same payload.
- Pass watched form values to request builders, search URL builders, and action helpers unnormalized;
  those boundaries own trimming, coercion, and normalization. Normalize a watched value in component
  code only when current rendered UI needs the normalized value immediately, such as disabling a button
  for whitespace-only input.
- Before adding a hand-written validator, type guard, or `typeof` shape check for submitted data, find
  the Zod schema that already owns that shape and reuse it at the boundary.
- Preserve the fetcher's discriminated result union and narrow it through its status field; consumers
  define no parallel success or error shapes.
- In field maps, keep short Zod schemas at the field that owns them. Extract a schema constant only when
  it owns a canonical field pattern, meaningful per-call options, or enough repeated complexity that the
  field definitions become easier to audit; reusing a short preprocess, coerce, or format chain a couple
  of times is not enough.
- Define a schema once at the point of use, moving it closer to the runtime context it needs when
  necessary. Layer `baseSchema` plus `schemaWithConfig` only when the base schema is reused
  independently.
- Use `z.unknown().transform(...)` only at a real untyped boundary. When the transform mostly interprets
  application grammar or query behavior, keep Zod focused on request shape and coercion and do that
  interpretation near the code that uses the result.

## Batch work

- Design batch work around independently identifiable items and preserve each item's outcome. After a
  partial failure, retry only failed or unknown items; repeat a successful item only when its inputs
  changed or the operation is explicitly atomic.
- A fetch, queue, rate-limit, or processing batch is not automatically a transaction boundary. Scope
  each transaction to the smallest unit that must commit atomically, and use a batch-wide transaction
  only when a documented invariant requires the entire batch to succeed or fail together.
- Make a batch script resumable and idempotent where practical, and emit or retain enough structured
  status to distinguish succeeded, failed, skipped, and unattempted items.
- Run independent operations separately or in parallel so one failure cannot hide the others' outcomes;
  repeat the entire batch only when its semantics require all items to run from the same starting state.

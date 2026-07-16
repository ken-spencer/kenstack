# Data Instructions

Read this before database, Drizzle, table schema, Zod, validation, or pipeline schema work.

## Database

- Use Drizzle ORM.
- Do not edit generated migrations casually.
- Do not run Prettier against generated Drizzle `.sql` migration files.
- Do not change schema names or column names without checking existing migrations.
- Treat existing migration files and journal entries as durable and append-only by default. Do not infer that a database is disposable from its URL, environment name, current contents, repository deployment configuration, or the absence of another visible database.
- A request to reset, rebase, squash, or regenerate migration history authorizes changes to migration files, snapshots, and journals only. It does not authorize modifying a database, its schemas, its data, or its migration ledger, even when the database is described as development-only, greenfield, disposable, or safe to reset.
- Never run `DROP DATABASE`, `DROP SCHEMA`, broad `TRUNCATE`/`DELETE`, database reset commands, or equivalent destructive operations unless the user separately and explicitly requests that exact database operation. Before executing it, identify the target database and state that its application data will be deleted.
- Generate append-only migrations for normal schema evolution. Rebase or squash history only when the user explicitly requests it; treat that as authorization for migration-artifact cleanup only, not as a permanent project state.
- Keep schema changes and data transformations needed by every existing database in the replayable migration chain. For a simple development-only change to one known database, use a direct transactional query and verify the result. Use a separate operator-run script only when the operation is complex, repeatable, or needs to remain as a runbook; keep either path outside the replayable chain and give retained scripts narrow preconditions and rerun protection.
- After rebasing migration history, report that existing databases may have an incompatible ledger and stop. Do not reset a database or rewrite/reconcile its migration ledger unless the user separately requests that database operation.
- Prefer explicit nullability and defaults.
- Use `defineTable` flags for standard Kenstack table capabilities: `reorder: true` for `sortOrder`, `publish: true` for `visibility`/`publishedAt`, and `seo: true` for `seoTitle`/`seoDescription`/`ogImage`. Do not hand-add those standard bundles to module `columns` unless the table intentionally needs a custom shape.
- Use existing Kenstack table helpers for standard relationship tables. In particular, use `defineTags({ table, prefix })` from `@kenstack/db/tables/tags` for tag relation tables instead of hand-writing the same `tableId`/`tagId`/`createdAt` table and indexes.
- Use isomorphic `defineFields({ publish: true, seo: true, fields: { ... } })` from `@kenstack/admin/fields` for field maps. Keep field-set options on that wrapper instead of creating alternate plain field-definition paths.
- Do not hand-write field helper internals such as `__kenstackField` in site modules. That marker is owned by Kenstack field factories; use `field(...)` for custom field values or an existing convenience helper such as `textField(...)`, `dateField(...)`, or `tagField(...)` for standard inputs.
- In field definitions, omit default-valued options unless they are changing behavior or clarifying a non-obvious exception. For example, do not restate `searchable: false` or `revisions: true` on `field(...)` calls.
- Avoid Drizzle `.select()` with no field projection unless the code truly consumes the full row as the domain object. Prefer `.select({ ... })` with the exact columns or expressions the caller reads, so query cost and TypeScript inference stay obvious. If a full-row select is necessary for an extension point such as field lifecycle hooks or revalidation callbacks, add a short nearby comment naming that boundary.
- For child-collection persistence, do not delete and recreate all rows on save. Load current rows, preserve stable IDs, insert only records explicitly marked as new, update only rows whose values changed, and remove only rows explicitly marked for removal. Preserve durable row IDs, especially for records that may be referenced by sales, tickets, audit rows, schedules, or future integrations.
- Prefer explicit client markers such as `isNew` and `isRemoved` for editable collection rows. Do not infer removal from an omitted row when the UI can keep the row in form state and hide it after marking it removed.

## Embedded IDs

- For stable identity inside a small, non-secret JSONB collection, prefer `unsecureId()` from `@kenstack/lib/unsecureId` over `crypto.randomUUID()`, array indexes, or a new ad hoc generator. Reuse an existing durable domain key instead when it already uniquely identifies the entry.
- Do not use `unsecureId()` for authentication or reset tokens, access-control decisions, or identifiers that must be difficult to guess. Keep those on their secure-token path.

## Validation

- Use Zod v4.
- Prefer Zod's direct string message syntax when it is supported, for example `.refine(check, "Message")` and `.min(1, "Message")`, instead of wrapping simple messages in `{ message: "Message" }`.
- Keep client and server schemas aligned.
- Use server-specific coercion only where needed.
- Prefer passing schemas to `pipelineStage({ schema })` so parsing and errors are handled by the pipeline. Manual `safeParse` / `parse` inside a stage is an escape hatch for cases the pipeline cannot express.
- Before adding a Zod `.parse(...)` or `.safeParse(...)`, trace the boundary that produced the value. If a route, pipeline stage, admin field schema, field lifecycle, or prior helper already parsed it, consume the parsed output type instead of reparsing.
- For submitted request data, the schema passed to `pipelineStage({ schema })` should produce the validated and normalized shape the action needs. Put request-field transforms, defaults, refinements, and derived request values in that pipeline schema instead of reparsing or reshaping the same fields inside the action handler.
- Do not call `.parse(...)` or `.safeParse(...)` inside a pipeline action for fields that were already accepted by that action's pipeline schema. If the handler needs a different output shape, define an action-specific schema with `.transform(...)` or `.pipe(...)` and pass that schema to `pipelineStage`.
- If a client form needs raw input values while the server action needs normalized values, keep the client form schema focused on form input and derive a separate server/action schema from it for the pipeline stage. Do not share a client schema in a way that forces the server action to manually reparse the same payload.
- Do not pre-normalize watched form values before passing them into request builders, search URL builders, or action helpers that already own normalization. Let the boundary helper or schema trim, coerce, and normalize request data. Normalize watched values in component code only when current rendered UI behavior needs the normalized value immediately, such as disabling a button for whitespace-only input.
- Keep server-only validation, parsing, query, and fetch helpers out of files imported by Client Components. If a helper is only used by API routes, pipeline actions, field save/load hooks, or other server-owned flows, put it under an `api/` or server-owned module path instead of mixing it with client-used request builders, URL builders, or field helpers.
- Manual parsing inside a pipeline action is only acceptable for data that is not the submitted request payload, a truly external/untyped boundary, or a dynamic schema that cannot be known until the action loads additional context. Keep that exception narrow and make the reason clear in the surrounding code.
- Before adding a hand-written validator, type guard, or `typeof` shape check for submitted data, check for an existing Zod schema that already owns that shape. Reuse the schema at the boundary instead of duplicating validation logic.
- Do not re-parse field values inside field save/load/display behavior when the enclosing action has already parsed the payload through its pipeline schema. Treat field behavior as receiving validated values, and keep any necessary cast narrow at that untyped lifecycle boundary.
- In field maps, keep short Zod schemas at the field that owns them. Do not extract a local schema constant only to reuse a short preprocess, coerce, or format chain a couple of times; extract only when the helper owns a canonical field pattern, meaningful per-call options, or enough repeated complexity that the field definitions become easier to audit.
- Do not create a second enhanced schema when the original can be defined correctly at the point of use. Move the schema closer to the needed runtime context instead of layering `baseSchema` plus `schemaWithConfig`, unless the base schema is reused independently.
- Be cautious with `z.unknown().transform(...)`. Use it only at a real untyped boundary. If the transform is mostly interpreting application grammar or query behavior, keep Zod focused on request shape/coercion and do that interpretation near the code that uses the result.

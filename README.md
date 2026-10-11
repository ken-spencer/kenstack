# Kenstack

Kenstack is a shared CMS/admin core for Next.js host sites. Host projects provide application-specific modules, tables, narrow host bindings, and environment configuration through the documented Kenstack entry points.

## Host Expectations

- Next.js App Router
- React and React DOM 19.3+
- Node.js 24+
- Drizzle/Postgres application tables
- `@app/db`, `@app/email`, `@app/modules`, `@app/deps`, and `@app/roles` mapped to their host owners
- Kenstack modules defined with `defineModule`, `defineTable`, `defineFields`, and field helpers

## Scripts

Run scripts from this package directory unless your host site wraps them.

```bash
npm run trace
```

Starts Next.js in development mode on port 3001 with deprecation tracing enabled.

```bash
npm run lint
npm run prettier
```

Checks lint and formatting.

## Record Saving

Use `saveModuleRecord` for authenticated site actions that update a record owned by a Kenstack module. It derives the table, persistence behavior, and cache revalidation from `module`. It writes the columns named in `values` and runs the handlers of the module fields among them, so the action's Zod schema is the allowlist of what the action may change and return. Field handlers receive restricted authority, so existing media must already belong to the record and admin-managed metadata is preserved.

```ts
await saveModuleRecord({ module, id, changes, values });
```

Use `saveAdminRecord` for the standard admin save action. It accepts the same record input plus `updatedAt`, the concurrency token the form loaded (`null` for a new record), derives the same module behavior, and gives field handlers admin-save authority. The helper checks no permission: the owning pipeline must authorize the caller, as the admin save does with the module's `edit` permission (`access: { module: module.name, permission: "edit" }`).

```ts
await saveAdminRecord({ module, id, changes, values, updatedAt });
```

Use `saveRecord` only when persistence is not represented by a module, such as module settings or page-editor content with a custom upsert. It is restricted by default. Pass `admin: true` only from a backend action that has already established admin access; never accept or derive this value from submitted data or the user's roles.

## Payments

Payments (shared checkout, holds, refunds, orders admin) live in Sympolis, a separate private
repository mounted beside Kenstack as `sympolis/` and imported as `@sympolis/*`; see
`sympolis/AGENTS.md` and `sympolis/docs/payments/checkout.md`.

## Server Error Reporting

Email alerting is enabled when the host provides:

- `MONITORING_EMAIL`
- `FROM_ADDRESS`

Repeats of one error are emailed once per 15 minutes, tracked in Vercel's Runtime Cache. Off Vercel,
each server instance tracks its own repeats in memory.

## Conventions

Standing agent rules live in `AGENTS.md`; stable technical references live in `docs/`, and downstream
migration notes live in `CHANGELOG.md`.

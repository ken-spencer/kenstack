# Kenstack

Kenstack is a shared CMS/admin core for Next.js host sites. Host projects provide application-specific modules, tables, dependency wiring, and environment configuration through the documented Kenstack entry points.

## Host Expectations

- Next.js App Router
- React 19+
- Node.js 24+
- Drizzle/Postgres application tables
- `@app/deps` configured by the host site
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

Use `saveModuleRecord` for authenticated site actions that update a record owned by a Kenstack module. It derives the table, persistence behavior, and cache revalidation from `module`; the action supplies its restricted server field set so the response cannot include admin-only fields. Field handlers receive restricted authority, so existing media must already belong to the record and admin-managed metadata is preserved.

```ts
await saveModuleRecord({ module, fields, id, changes, values });
```

Use `saveAdminRecord` for the standard admin save action. It accepts the same record input, derives the same module behavior, and gives field handlers admin-save authority. The owning pipeline must enforce `access: "admin"`; this helper does not check the current user's role.

```ts
await saveAdminRecord({ module, id, changes, values });
```

Use `saveRecord` only when persistence is not represented by a module, such as module settings or page-editor content with a custom upsert. It is restricted by default. Pass `admin: true` only from a backend action that has already established admin access; never accept or derive this value from submitted data or the user's roles.

## Server Error Reporting

Email alerting is enabled when the host provides:

- `MONITORING_EMAIL`
- `FROM_ADDRESS`
- either `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or the Vercel Marketplace pair `KV_REST_API_URL` and `KV_REST_API_TOKEN`

## Conventions

Agent-facing implementation guidance lives in `agents/`. Those files are the source of truth for Kenstack coding conventions, data rules, UI/admin boundaries, TypeScript policy, and migration notes.

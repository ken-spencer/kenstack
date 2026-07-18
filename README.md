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

```bash
npm run users:add-admin
```

Interactively creates an admin user. The script loads database settings from the host environment, `.env.local`, or `.env`.

## Conventions

Agent-facing implementation guidance lives in `agents/`. Those files are the source of truth for Kenstack coding conventions, data rules, UI/admin boundaries, TypeScript policy, and migration notes.

# Kenstack Agent Instructions

## Scope

Kenstack is a shared submodule. Treat committed public APIs and behavior as used outside the current
host repository.

## Technical references

Read only the references relevant to the current task:

- React APIs, client state, Next.js runtime, caching, or Suspense: `docs/runtime-boundaries.md`
- Public errors, reporting, or request metadata: `docs/error-reporting.md`
- Admin modules, UI, forms, lists, or saving: `docs/admin.md`
- Database, Drizzle, Zod, validation, or persistence: `docs/data.md`
- File ownership, folders, or entry points: `docs/code-organization.md`
- Committed API changes or downstream upgrades: `docs/upgrading.md`

## Public surface

- Do not promote development-only flags, guards, labels, or components to production without approval.
- Treat committed public APIs as externally consumed. Do not remove, rename, narrow, inline, or change
  them incompatibly without explicit authorization. For an authorized break, follow `docs/upgrading.md`.
- For uncommitted APIs, update call sites directly. Do not add compatibility aliases, shims, or temporary
  re-exports.

## Verification

- Run TypeScript after type-affecting changes and lint after code or style changes.
- After a coherent behavior change, run the narrowest relevant existing tests. Rerun only after edits
  that affect the behavior.
- Report failures and material blockers. Omit successful routine checks unless asked.
- Do not run production builds unless explicitly asked.

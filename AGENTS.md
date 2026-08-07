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
- Adding, organizing, reviewing, or cleaning types; TypeScript inference, generics, overloads,
  predicates, assertions, or compiler diagnostics: `docs/typescript.md`
- Kenstack repository layout or an area's internal structure: `docs/kenstack-anatomy.md`
- Host-site containers, wiring, or placement: `docs/site-anatomy.md`
- A registered module's internal structure or module queries: `docs/module-anatomy.md`
- Cross-cutting ownership, helper, type, header, or unit-boundary principles: `docs/code-organization.md`
- Diagnosing or fixing regressions, failed checks, runtime errors, or broken UI: `docs/debugging.md`
- Committed API changes or downstream upgrades: `docs/upgrading.md`

## Code posture

- Write code so a reader can follow it from top to bottom. Keep one-use logic at its call site. Add a
  helper, alias, wrapper, or other indirection only when it removes more complexity than it introduces
  or marks a real policy boundary. Local readability takes priority over deduplication, symmetry, and
  type-level cleverness.
- Keep one canonical owner for labels, options, metadata, schemas, configuration, and other domain
  facts. Consumers derive or assemble those facts; they do not copy them into parallel lists,
  registries, or validation paths.
- Prefer inferred internal types. An explicit annotation, assertion, or cast must protect a deliberate
  contract, preserve meaningful inference, or bridge a verified boundary. When the type checker fails,
  fix the producer or contract rather than widening, casting, using `any`, or adding a non-null
  assertion merely to silence the diagnostic.
- Prefer `===` and `!==` for equality comparisons. Use `Object.is` only when a concrete, likely runtime
  case needs its distinct `NaN` or signed-zero semantics and that benefit outweighs the readability cost.
- Keep configuration surfaces minimal. Add a prop or option only when a current production caller needs
  a real variation. Defaults and invariant behavior stay inside their owner; do not expose speculative
  controls for possible future wording, styling, or behavior. When variation is needed, expose the
  smallest difference that satisfies it.
- Put behavior shared by every host at the narrowest Kenstack owner. Keep a host override only when it
  represents a genuine host-specific difference.
- Every edit must provide a concrete current improvement. Do not churn between equally clear equivalent
  forms; behavior-preserving simplification is appropriate when it reduces indirection or clarifies
  ownership.
- Write a defensive guard against the narrowest credible reachable conflict with meaningful
  consequences. Its message must be true for every case it blocks; otherwise narrow the condition or
  support the broader case.
- Make a non-obvious constraint, invariant, or intentionally surprising behavior visible when the code,
  types, and names do not explain it and a maintainer could plausibly remove or violate it. Prefer a
  clarifying name or direct structure when sufficient; otherwise add the smallest accurate comment. Do
  not narrate syntax or control flow.
- Do not add production exports, options, parameters, reset hooks, injectable seams, or branches solely
  to expose implementation details to tests. Test through a durable public or domain boundary; when that
  is impossible, decide whether a real production contract is missing before adding one.

## Public surface

- Preserve development-only gates such as `process.env.NODE_ENV === "development"` and explicit
  development flags. Do not expose their gated behavior in production by removing, weakening, or
  inverting the gate unless the user explicitly authorizes promoting that behavior and its production
  configuration.
- Treat committed public APIs as externally consumed. Do not remove, rename, narrow, inline, or change
  them incompatibly without explicit authorization. For an authorized break, follow `docs/upgrading.md`.
- For uncommitted APIs, update call sites directly. Do not add compatibility aliases, shims, or temporary
  re-exports.

## Verification

- Before creating a test, name the durable contract and a plausible regression it should catch. Write
  the test from that contract rather than from the current implementation. It may be written before,
  during, or after implementation once its expected behavior can be stated independently. Prefer a
  test that exercises the public or domain boundary and survives behavior-preserving refactors.
- Treat test churn as evidence about the test. When production behavior has not changed, an existing
  test should normally remain unchanged. If a move, rename, type cleanup, or internal reorganization
  forces the test to follow the implementation, rewrite it against the stable boundary or remove it.
  If a newly written test keeps changing while the requirement has not changed, stop syncing it and
  likewise rewrite it at the stable boundary or remove it.
- Derive expected values from the requirement, an incident, an independent oracle, or deliberately
  characterized existing behavior. Do not paste observed output into an expectation without
  independently reviewing and accepting that behavior.
- Runtime tests must exercise runtime behavior. Keep compile-time contract fixtures under `tests/types/`
  and verify them with TypeScript; do not wrap erased type assertions or unreachable examples in a
  passing Vitest case.
- Use the narrowest test boundary that can establish the contract. When it depends on wiring,
  transaction rollback, database concurrency, provider protocol behavior, or rendered interaction that
  a unit test cannot establish, use an integration or UI test instead. Keep those tests out of routine
  verification for changes that do not affect their boundary.
- PostgreSQL tests under `tests/integration/` are explicit user-triggered or pre-launch checks, not
  routine development verification. Do not run them or request sandbox or shared-memory permission for
  them unless the user explicitly asks for integration testing or a pre-launch verification pass. When
  relevant but not requested, report the available check without invoking it.
- A change does not automatically owe a test.
- Do not pin a constant merely because it exists. Pin its exact value only when that value is an
  observable product, protocol, or compatibility decision.
- Run TypeScript after type-affecting changes and lint after code or style changes.
- After a coherent behavior change, run the narrowest relevant existing tests. Rerun only after edits
  that affect the behavior.
- Tests protect durable observable behavior or a deliberate compile-time contract. Do not preserve
  temporary scaffolding, duplicated enforcement, or incidental implementation structure in tests.
- Report failures and material blockers. Omit successful routine checks unless asked.
- Do not run production builds unless explicitly asked.

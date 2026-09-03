# Kenstack Agent Instructions

## Scope

Kenstack is a shared submodule. Treat committed public APIs and behavior as used outside the current
host repository.

## Technical references

Read only the references relevant to the current task:

- React APIs, client state, Next.js runtime, caching, or Suspense: `docs/runtime-boundaries.md`
- Browser inspection or visual verification: `docs/browser-verification.md`
- StepFlow, multi-step workflow composition, navigation, completion, or browser persistence:
  `docs/step-flow.md`
- Public errors, reporting, or request metadata: `docs/error-reporting.md`
- Forms, shared form controls, React Hook Form state, or form validation: `docs/forms.md`
- Admin modules, UI, lists, saving, or admin-specific form integration: `docs/admin.md`
- Database, Drizzle, Zod, validation, persistence, or batch scripts: `docs/data.md`
- Adding, organizing, reviewing, or cleaning types; TypeScript inference, generics, overloads,
  predicates, assertions, or compiler diagnostics: `docs/typescript.md`
- Kenstack repository layout or an area's internal structure: `docs/kenstack-anatomy.md`
- Host-site containers, wiring, or placement: `docs/site-anatomy.md`
- A registered module's internal structure or module queries: `docs/module-anatomy.md`
- Cross-cutting ownership, import paths and grouping, helpers, configuration surfaces, file headers,
  unit boundaries, code comments, or interface copy: `docs/code-organization.md`
- Naming or renaming a symbol, prop, file, or folder, or a function's reading order: `docs/naming.md`
- Creating, changing, or consolidating a UI component, or `role` and `aria-*` attributes:
  `docs/components.md`
- Reviewing code changes: `docs/review.md`
- Cleaning up code changes: `docs/cleanup.md`
- Diagnosing or fixing regressions, failed checks, runtime errors, or broken UI: `docs/debugging.md`
- Committed API changes or downstream upgrades: `docs/upgrading.md`

## Code posture

- When responding to a correction or objection, lead with the evidence, consequence, or corrective
  action, without canned validation such as “you’re right to challenge that”.
- Use the simplest direct implementation that satisfies the current requirement.
- Write code a reader can follow from top to bottom: keep one-use logic at its call site and apply the
  indirection rules in `docs/code-organization.md`. A descriptive name alone does not earn a helper,
  alias, wrapper, or other indirection.
- Keep one canonical owner for labels, options, metadata, schemas, configuration, and other domain
  facts; consumers derive or assemble them from that owner instead of keeping parallel copies.
- A new entry in `dependencies`, `devDependencies`, or `peerDependencies` requires explicit user
  authorization. Propose one only after identifying the current need and why the native platform, the
  owning API, and already-adopted libraries cannot meet it.
- Prefer inferred internal types. An explicit annotation, assertion, cast, wrapper, overload, or generic
  must protect a deliberate contract or bridge a verified boundary; when the type checker fails, fix the
  producer or contract. `docs/typescript.md` owns the rules.
- Use `===` and `!==`; use `Object.is` only when `NaN` or signed-zero semantics matter for a real case.
- Keep configuration surfaces minimal: add a prop or option only when a current production caller needs
  the variation or the user explicitly requested it for upcoming work, and expose the smallest
  difference that satisfies it. A user-requested surface is a current requirement even with no caller:
  mark it with a one-line comment naming the upcoming use so a later pass can tell it from a speculative
  one, and cleanup and review must not remove it. `docs/code-organization.md#configuration-surfaces`
  owns the rules.
- Put behavior shared by every host at the narrowest Kenstack owner; keep a host override only for a
  host-specific difference.
- Every edit must improve something concrete: change requested behavior, reduce indirection, or clarify
  ownership. Leave equally clear equivalent forms alone. A name that existed before the current task
  is an equivalent form: never rename such a symbol, prop, file, or folder unless the user asked for
  that rename. There is no other exception: when a name looks wrong, or the change makes it wrong, keep
  it and list the proposed rename in the handoff for the user to decide. Names introduced in the
  current task are the agent's draft and must satisfy `docs/naming.md` before handoff; a name whose
  origin is unclear counts as pre-existing. Cleanup and review never rename.
- Write a defensive guard against the narrowest credible reachable conflict with meaningful
  consequences, with a message that is true for every case it blocks; otherwise narrow the condition or
  support the broader case.
- Apply the explanatory-text rules in `docs/code-organization.md` to code comments and user-facing copy.
- Test through a durable public or domain boundary. Production exports, options, parameters, reset
  hooks, seams, and branches exist for production consumers, never only for tests; when a test cannot
  reach the behavior, decide whether a real production contract is missing before adding one.

## Public surface

- Preserve development-only gates such as `process.env.NODE_ENV === "development"` and explicit
  development flags. Promote gated behavior to production only when the user explicitly authorizes that
  behavior and its production configuration.
- Add a module export only when another current production module imports it or a fixed framework or
  tooling entry point requires it, and a public-entry re-export only when a current host imports that
  contract. Otherwise keep the declaration file-local.
- Treat committed public APIs as externally consumed: removing, renaming, narrowing, inlining, or
  changing one incompatibly requires explicit authorization, and an authorized break follows
  `docs/upgrading.md`.
- For APIs introduced within the current change, update consumers directly; they need no compatibility
  aliases, shims, or temporary re-exports.

## Verification

- Before creating a test, name the durable contract and a plausible regression it should catch, and
  write the test from that contract. It may be written before, during, or after implementation once its
  expected behavior can be stated independently. Prefer a test that exercises the public or domain
  boundary and survives behavior-preserving refactors.
- Treat test churn as evidence about the test. When production behavior has not changed, an existing
  test stays unchanged; when a move, rename, type cleanup, or internal reorganization forces it to follow
  the implementation, rewrite it against the stable boundary or remove it. A new test that keeps
  changing while the requirement has not changed gets the same treatment.
- Derive expected values from the requirement, an incident, an independent oracle, or deliberately
  characterized existing behavior. Review and accept observed output before it becomes an expectation.
- Runtime tests exercise runtime behavior. Keep compile-time contract fixtures under `tests/types/` and
  verify them with TypeScript; a Vitest case cannot check an erased type.
- Use the narrowest test boundary that can establish the contract. When it depends on wiring,
  transaction rollback, database concurrency, provider protocol behavior, or rendered interaction, use
  an integration or UI test, and keep those tests out of routine verification for changes that do not
  affect their boundary.
- PostgreSQL tests under `tests/integration/` run only when the user explicitly asks for integration
  testing or a pre-launch verification pass; they need sandbox or shared-memory permission that routine
  work must not request. Mention an un-run opt-in check in the handoff only when the user asked for it
  or its absence leaves a material unresolved risk.
- A change does not automatically owe a test.
- Pin a constant's exact value only when that value is an observable product, protocol, or
  compatibility decision.
- Run TypeScript after type-affecting changes and lint after code or style changes.
- After a coherent behavior change, run the narrowest relevant existing tests; rerun only after edits
  that affect the behavior.
- Tests protect durable observable behavior or a deliberate compile-time contract, never temporary
  scaffolding, duplicated enforcement, or incidental implementation structure.
- Report failures and material blockers; omit successful routine checks unless asked.
- Run production builds only when explicitly asked.

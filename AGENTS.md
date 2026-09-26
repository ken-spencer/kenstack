# Kenstack Agent Instructions

## Scope

Kenstack is a shared submodule. Treat committed public APIs as used outside the current host
repository. A format Kenstack both writes and reads itself (a URL parameter, API action name,
cookie or payload field name) is internal: change it with its writer and reader, without a
compatibility path or upgrade note.

## Technical references

Read only the references relevant to the current task:

- React APIs, client state, Next.js runtime, caching, or Suspense: `docs/runtime-boundaries.md`
- Authentication redirects, protected pages, or auth behavior in a host proxy:
  `docs/auth-routing.md`
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
  unit boundaries, or code comments: `docs/code-organization.md`
- Writing or changing any user-visible text (labels, notices, dialog and status lines, empty states):
  `docs/code-organization.md#explanatory-text`
- Naming or renaming a symbol, prop, file, or folder, or a function's reading order: `docs/naming.md`
- Creating, changing, or consolidating a UI component, page markup or styling, or `role` and `aria-*`
  attributes: `docs/components.md`
- Adding, removing, or judging a test: `docs/testing.md`
- Reviewing code changes: `docs/review.md`
- Cleaning up code changes: `docs/cleanup.md`
- Diagnosing or fixing regressions, failed checks, runtime errors, or broken UI: `docs/debugging.md`
- Committed API changes or downstream upgrades: `docs/upgrading.md`

## Code posture

- When responding to a correction or objection, lead with the evidence, consequence, or corrective
  action, without canned validation such as “you’re right to challenge that”.
- Use the simplest direct implementation that satisfies the current requirement.
- Apply the ownership, indirection, configuration, and explanatory-text rules in
  `docs/code-organization.md`; keep domain facts with one canonical owner.
- Never pass a value through props or parameters when the function or component can derive it itself.
- A new entry in `dependencies`, `devDependencies`, or `peerDependencies` requires explicit user
  authorization. Propose one only after identifying the current need and why the native platform, the
  owning API, and already-adopted libraries cannot meet it.
- Prefer inferred internal types; `docs/typescript.md` owns annotations, assertions, and boundary
  contracts.
- Use `===` and `!==`; use `Object.is` only when `NaN` or signed-zero semantics matter for a real case.
- Code goes on the site by default. When site work needs a change to something in Kenstack, and that
  change would likely benefit another site, make it in Kenstack. Reusable does not mean Kenstack:
  another shared package (such as payments) owns its own domain. Keep each unit whole in one
  repository rather than splitting it between the site and a package. When it is unclear which side
  owns a unit, ask before building; ownership is the user's call.
- Every edit must change requested behavior, reduce indirection, or clarify ownership. Leave equally
  clear equivalent forms alone.
- Never rename a pre-existing symbol, prop, file, or folder unless the user requested that rename.
  Preserve questionable names and propose them in the handoff; uncertain origin counts as pre-existing.
  If keeping a name would force a workaround (a flag, mode branch, alias or special case that exists
  only to avoid the rename), stop and propose the rename before building, with the workaround it removes.
  Names introduced in the current task must satisfy `docs/naming.md`. Cleanup and review never rename.
- Write a defensive guard against the narrowest credible reachable conflict with meaningful
  consequences, with a message that is true for every case it blocks; otherwise narrow the condition or
  support the broader case.
## Public surface

- Preserve development-only and launch gates. Promoting gated behavior requires explicit user
  authorization for both the behavior and its production configuration. Place each gate once at the
  outermost effective loader or render boundary; remove redundant inner checks.
- Add a module export only when another current production module imports it or a fixed framework or
  tooling entry point requires it, and a public-entry re-export only when a current host imports that
  contract. Otherwise keep the declaration file-local.
- A public API is a committed export of a file headed "Public entry point", or a committed export a
  current host imports. Everything else, including exports that exist only for other Kenstack modules,
  is internal and changes with its callers.
- Treat committed public APIs as externally consumed: removing, renaming, narrowing, inlining, or
  changing one incompatibly requires explicit authorization, and an authorized break follows
  `docs/upgrading.md`.
- For APIs introduced within the current change, update consumers directly; they need no compatibility
  aliases, shims, or temporary re-exports.

## Verification

- Development adds no tests. A test enters a suite only through the `$tests` skill on the user's
  explicit request, under `docs/testing.md`. Development keeps existing tests passing: update one
  mechanically to a changed public shape, delete one that pins removed structure, never rewrite one to
  keep it alive. When behavior is unchanged, leave tests unchanged; a test that a refactor forces to
  follow internal structure is removed and its replacement named as a `$tests` candidate.
- Tests never justify retaining worse production code. Production exports, options, parameters, reset
  hooks, and branches need production consumers, never only tests.
- PostgreSQL tests under `tests/integration/` run only when the user explicitly asks for integration
  testing or a pre-launch verification pass; they need sandbox or shared-memory permission that routine
  work must not request. Mention an un-run opt-in check in the handoff only when the user asked for it
  or its absence leaves a material unresolved risk.
- Run TypeScript after type-affecting changes and lint after code or style changes.
- After a coherent behavior change, run the narrowest relevant existing tests; rerun only after edits
  that affect the behavior.
- Report failures and material blockers; passing checks get at most one line, "Checks pass."
- Run production builds only when explicitly asked.

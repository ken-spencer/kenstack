# Code Organization

Consult this reference for ownership, import, helper, configuration-surface, and file-shape principles
that apply across Kenstack and host sites, and for code comments and interface copy. Repository and
module layouts are defined in `docs/kenstack-anatomy.md`, `docs/site-anatomy.md`, and
`docs/module-anatomy.md`. Naming lives in `docs/naming.md`, component reuse and accessible control
names in `docs/components.md`, and type ownership in `docs/typescript.md`; the cleanup and review
procedures that apply these rules live in `docs/cleanup.md` and `docs/review.md`.

## Unit ownership

- A definition belongs to the unit whose behavior or schema it configures, decided by what it defines
  and who consumes it, never by what it references: a product's `categoryId` field belongs to the
  product module even though it points at the category table.
- A consumer that displays another owner's data derives or references it. Aggregators and registries
  assemble owners without taking ownership from them.
- Resolving misplacement moves definitions across existing boundaries; the units themselves stay as
  they are. Merging, splitting, or dissolving a unit is a product decision that needs explicit
  authorization.

## Import paths

- Use `./` for collaborators in the same folder, and one `../` only when the target is inside the same
  organizational unit: one module, feature, multi-file component or field, or Kenstack top-level area.
- Beyond one parent directory, use the repository alias that names the owner: `@/`, `@kenstack/`, or a
  named `@app/*` host binding.
- An owner-qualified alias is always permitted within the same unit; prefer it when the relative path
  would obscure which unit supplies the dependency.
- Import the owning file or supported entry point directly. An alias clarifies ownership; it does not
  authorize importing a private implementation or routing an internal dependency through a public
  aggregate.
- When a file imports several distinct sets of collaborators, group imports by their role in the file
  (infrastructure, data loaders, composition helpers, workflow factories), separated by one blank line,
  keeping collaborators for the same operation together whatever their path style. A short import list
  stays as one group, and every group needs a meaningful role boundary.

## Canonical ownership

- Identifiers, labels, options, mappings, statuses, schemas, and configuration belong to the closest
  unit that defines their meaning. Expose or derive them there so no consumer maintains a synchronized
  copy.
- Registries assemble owners and may add registry-specific behavior; the facts each registered value
  already knows stay with that value. Keep entries from the same workflow adjacent, with a blank line
  between distinct workflow groups.
- When disagreement between two inputs can only produce an error or a no-op override, keep the
  canonical input and derive the other from it.
- Before creating or retaining a primitive, helper, component, schema, validator, or adapter, check for
  the capability in this order: a native operator or platform function, the owning API, then an adopted
  library. Use the native operation whenever it provides the required behavior, never a Lodash
  equivalent; when the platform has none, use the established library operation under its established
  name, such as Lodash `isEqual` for deep equality. A custom helper is justified only by a concrete
  behavioral difference none of those provide, never by naming or readability.
- Setup intrinsic to every use of an owner's API belongs behind that owner, even with one current
  consumer. When implementation reveals intrinsic behavior missing from the owner, change its
  implementation, defaults, or contract directly; callers do not prepare inputs, reproduce derived
  values, wrap results, or carry a workaround for it. Consumer-specific policy stays at the consumer.
- A factory, parser, resolver, compiler, or schema owns the values and states it constructs. Names such
  as `Defined`, `Resolved`, `Parsed`, `Validated`, and `Compiled` are construction-boundary signals:
  construct those values through their owner unless direct construction is explicitly supported.
- Define a value, schema, configuration, or helper once, where its required context is available, in
  place of a base plus a one-off "enhanced" copy. Keep a separate construction only when it has a
  different owner or absorbing it would broaden the canonical contract beyond current need.

## Direct expression

- When handling one optional value, use a direct lookup and an explicit branch; reserve collection
  operations for genuine collections.
- Omit a prop or option that exactly matches the consumer's declared default when omission and explicit
  presence mean the same thing. Pass it when it changes behavior or deliberately pins a policy that
  should survive a change to the default.
- Apply canonical-ownership, construction-boundary, intrinsic-setup, and configuration-surface rules
  before reference counts. When a multi-step workflow is affected, also apply the ownership and
  composition rules in `docs/step-flow.md`.
- For every changed non-exported local variable or function binding, including bindings introduced by
  destructuring, count its runtime references outside the declaration; assignments count, while imports
  and function parameters are outside this rule. Remove it at zero references. At one reference, inline
  it only when substitution preserves observable behavior, evaluation order and frequency,
  caller-visible TypeScript behavior, language and framework requirements, cache and transaction
  boundaries, and recursion. These are deterministic keep conditions: when one applies, leave the
  binding and record the constraint. Multiple references permit a binding without requiring one. Never
  satisfy this rule by changing how the program works.
- A substitution fails the caller-cost test when the enclosing call, JSX element, return expression,
  provider value, or registry entry must name or construct additional domain-specific props, options,
  fields, JSX, callbacks, schemas, conditions, sequencing, or policy; repeat setup; or embed async
  retrieval, transformation pipelines, or multi-field construction previously resolved outside that
  site. The test measures knowledge crossing a function boundary: a binding and its single reference
  within one function body share a site, so inlining between them cannot fail it.
- A factory, adapter, or step-definition boundary retains owner work when callers supply its domain
  inputs and only place the returned value into their own composition; one production reference does
  not invalidate owner work. A descriptive name, domain or policy wording, callback use, expression
  length, or distance from the use is never decisive on its own; retain the binding only when
  substitution violates a stated keep condition.
- Use the inference of a native, owner, or library operation directly, without a binding or wrapper
  that only reshapes it or an alias that repeats a short property lookup under another name.
- Construct a value as a complete literal when it is always complete.
- When branches perform the same operations in the same order and differ only in side-effect-free data,
  select the differing data at the branch and express the shared operations once. Keep separate
  branches for distinct decisions or failure reasons, or when consolidation would change evaluation
  order, frequency, or side effects.
- Combine adjacent guards when the inner branch only returns, throws, continues, or breaks and the
  combined condition still expresses one decision; keep separate branches for distinct decisions or
  failure reasons.

## Explanatory text

- Every comment and explanatory interface sentence supplies information its surrounding code or visible
  interface does not. For maintainers, that is a non-obvious constraint, invariant, or intentionally
  surprising behavior they could plausibly remove or violate; for users, the context, outcome,
  expectation, or next action they need at that moment.
- Let direct code structure, visible values, labels, and controls carry the point when they already do.
  Delete text that narrates syntax, control flow, the visible interface, prototype or component
  mechanics, or hypothetical future work, and any interface sentence whose deletion leaves the meaning
  and next action equally clear.
- Describe only behavior the product actually performs; prototype narration must never read as
  confirmation that an incomplete or mocked action occurred.

## Configuration surfaces

- Every prop and option is supported API. Start from the default behavior owned by the implementation
  and add configuration only when a current production caller needs the variation or the user
  explicitly requested it for upcoming work; future wording, styling, or behavior the agent imagines on
  its own earns none. A user-requested surface stays even while it has no caller.
- Expose the smallest meaningful difference; invariant labels, defaults, state transitions, and
  implementation details stay internal.
- A caller supplies domain input and genuinely optional policy; calculations, metadata, setup, and
  defaults the owner can derive stay with the owner. Existing differences between call sites do not
  establish variation: identify the concrete current requirement for each difference or consolidate it
  through the owner.

## Helper ladder

- Apply the ownership and caller-cost tests to every helper or factory before considering its reference
  count or export status. For a non-exported helper, the direct-expression reference-count rule above
  controls: one reference is inlined when direct substitution preserves functionality, including when
  that reference passes the helper as a callback. An uncommitted export does not retain a relay, and
  removing any export must still pass the ownership and caller-cost tests.
- With one consuming file, keep the helper file-local and unexported.
- A separate helper file requires multiple production consumers or a concrete runtime, tooling, or
  public-contract boundary. Tests are not production consumers and never justify a production export.
- Place an earned helper in the closest existing owner and role home, using that owner's `lib` location
  only when no more specific documented home applies. A plausible-sounding name does not create a shared
  folder.

## File and folder shape

- Files directly under a host-facing namespace such as `admin/` or `fields/` are supported entry
  points. A same-named component folder such as `AccountMenu/` or `ResetPassword/` is one component
  unit, not a host-facing namespace; keep its owned role files directly in that folder.
- Create an `internal/` folder, or add or move a file into one, only when the user explicitly requests
  that exact placement or project-owned documentation names that exact folder as the required
  destination for the file's role. An existing `internal/` folder does not authorize additional
  contents, and an existing `lib/` folder is private only under the same placement gate.
- Keep a standard kind as one file while one file is sufficient, and promote it to the same-named folder
  only when multiple owned files need grouping. A single file or an index barrel never earns a folder.
- When several files form one unit, use the folder name for the concept and established role filenames
  inside it; repeat the concept only when otherwise-identical role filenames would collide at an import
  boundary.
- For internal moves, update consumers directly and delete the old path; compatibility barrels,
  wrappers, aliases, or adapter imports remain only where a committed external contract requires them.
- Entry-point and public-surface files carry a short header naming their audience, actual importers,
  and export boundary, and stay reserved for that boundary; internal imports go to the owning file.
  Omit the header only when framework syntax or a documented fixed-entry surface determines both and
  the file contains no additional exports.
- Apply formatting only through the configured formatter and only within the touched scope.

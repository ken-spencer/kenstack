# Cleanup

Use this checklist after implementation or on an explicit cleanup request. Cleanup removes unnecessary
complexity and repairs objective rule violations while preserving product behavior, vocabulary, and the
task's scope.

## Scope and posture

- Inspect repository status first and preserve unrelated work.
- The default scope is the dirty files, including unstaged and untracked ones, and their nearby
  context. Expand to the full project only on request or when an affected owner cannot otherwise be
  found.
- Read the current diff before editing. Keep an existing change when it improves something concrete;
  leave equally clear forms alone.
- Before treating a cleanup as mechanical, establish equivalence across observable behavior,
  caller-visible type inference, ownership, and the external contract. A clean compile proves
  compatibility, not equivalence.
- Ask whether a simpler direct approach gives the same result and whether every abstraction or
  mechanism earns its cost.
- Apply only narrow changes with an objective ruling from this checklist. When a choice needs new
  product, API, design, or naming judgment, flag the exact unresolved decision and the evidence needed
  to make it.

## Checklist

- **Ownership and duplication:** Apply the canonical-ownership and direct-expression rules in
  `docs/code-organization.md` and the component-reuse rules in `docs/components.md`. Compare every new or
  changed site component with Kenstack and with existing site components across `app`, `components`,
  `features`, modules, and shared domains; during a requested site-wide cleanup, inventory all
  production site components and compare them with one another, including components outside the
  dirty-file set. Rule on each comparison from behavior and ownership: when ownership is duplicated,
  name the canonical owner and the differences it must preserve, then replace the duplicate through
  that owner; when ownership is distinct, name the domain behavior or contract that requires separate
  components. A similarity score, visual resemblance, or unresolved candidate is not a finding.
- **Owner APIs and configuration:** Inventory every new or changed prop, option, default, explicit
  override, and repeated setup around an affected reusable component or function, and inspect every
  production call site for each configuration point. Each difference needs the current behavior that
  requires it; existing divergence is not evidence of intent. Repeated or near-equivalent literals,
  caller-recomputed owner metadata, and setup repeated at call sites are reasons to improve the owner's
  implementation, defaults, or contract. Keep only genuinely optional consumer policy outside the owner,
  and flag unresolved product choices for the user's ruling. For an affected multi-step workflow, apply
  the ownership and composition checks in `docs/step-flow.md`.
- **Helpers and indirection:** Inventory every new or changed helper, wrapper, mapper, normalizer, and
  local alias. Apply the ownership and construction-boundary rulings first, then the capability order,
  local-binding rule, and helper ladder in `docs/code-organization.md`, whatever the declaration's
  reference count or export status. Inline a one-reference non-exported local variable or function
  binding, including destructured bindings and callbacks, when direct substitution satisfies that
  rule's keep conditions; for a retained binding, record the concrete constraint, which is never
  readability or a descriptive name. Remove pass-through and delegating layers through the call-path
  collapse procedure below. A cleanup that fails the caller-cost test or spreads owner-specific setup
  across call sites is rejected.
- **Aliases and renamed bindings:** Inspect every new or changed import alias, destructuring rename,
  pass-through binding, and local alias. Use the canonical source name directly; keep a rename only
  when it resolves an actual collision or marks an explicit lifecycle boundary, and remove one that
  only introduces a synonym or repeats surrounding context. Cleanup never invents a replacement name;
  when the canonical name looks inaccurate or misleading, flag it for the user's ruling.
- **Names:** Audit new and changed names against `docs/naming.md`. First apply the capability order in
  `docs/code-organization.md` (native, then owner, then adopted library, then custom) and its direct
  inference rule to every new or changed helper, including predicates and comparison functions; then
  audit each function against the action-or-predicate naming rules in `docs/naming.md`. Compare every
  name with the symbol's actual contract or value. Cleanup never renames: report a convention
  violation, non-canonical vocabulary, or a factual mismatch between name and behavior for the user's
  ruling; readability preference, an unapproved synonym, and a qualifier that distinguishes another
  live variant are not even findings. Trace every new or changed cross-file model end to end and report
  vocabulary drift, keeping different names for genuinely different states (requested, persisted,
  rejected) even when their shapes match. When the user approves a rename, sweep the owning filename
  and folder, imports, exports, tests, and local symbols as one naming family. Apply the reserved
  runtime-boundary vocabulary in
  `docs/runtime-boundaries.md`, including the server-only meaning of `api`. Flag a questionable
  canonical name for the user's ruling.
- **Declarations and exports:** Inventory every new or changed declaration (functions, values, hooks,
  components, types) and inspect its production references. Apply the direct-expression
  reference-count ruling to every non-exported local variable or function binding; for other
  declarations, reference counts identify candidates for examination and are not the ruling. Each new
  runtime export needs a current production consumer or an intentional public boundary; otherwise keep
  it local. Committed public exports remain externally consumed.
- **Types:** Perform the complete inventory and rulings in the `Type cleanup` section of
  `docs/typescript.md`, including types in untracked files. Use owner inference or derive from the
  canonical producer; hand-write a type only for an intentional independent contract.
- **Invariants and defensive code:** Inventory every new or changed blocking guard. Its condition and
  message must describe the same restriction, and every blocked state must make the message true.
  Remove a fallback, type check, resolved-value alias, or nullability branch once routing, loading,
  schema validation, or an earlier guard establishes the state; enforce a required invariant once at
  its proper boundary.
- **Failure paths:** Inventory every new or changed `catch` block and every fallback reached because an
  operation failed. Keep it only when it rethrows the failure, translates it into a defined domain or
  public failure state and reports it as `docs/error-reporting.md` requires, or implements an
  already-authorized degradation with an explicit caller-visible result and a concrete product reason.
  An unexpected failure never becomes success, absence, or an empty value; a degradation not already
  established is flagged for the user's ruling.
- **Accessibility:** Apply the accessible-control-name rules in `docs/components.md` to every new or
  changed `role` and `aria-*` attribute, keeping only necessary and accurate semantics that native
  markup or visible content does not already supply.
- **Explanatory text:** Apply the explanatory-text rules in `docs/code-organization.md` to every new or
  changed code comment and explanatory interface sentence.
- **Residual artifacts:** Inspect changed debug output, reviewer notes, stale TODOs, suppressions,
  commented-out code, placeholders, and every untracked file in scope. Keep a changed artifact only for
  a concrete current purpose. Remove a task-created untracked file with no production, test, tooling,
  or documented operational purpose; report any other unexplained untracked file for the user's ruling.
- **Public surface:** Committed Kenstack APIs are externally consumed; an authorized break follows
  `docs/upgrading.md`. For uncommitted APIs, update consumers directly and remove compatibility aliases.

Cleanup is complete only when each item in the requested scope has a concrete keep, remove, correct, or
user-ruling outcome. A speculative suggestion is reported as such, never as required cleanup.

## Call-path collapse

- A new or changed helper is a delegating helper when it obtains its result or terminal effect by
  delegating to a project-owned helper and its remaining work only prepares, selects, guards, forwards,
  or reshapes that delegation, or returns or throws without performing it. Calls used solely to obtain
  or validate the delegated operation's inputs are preparation and do not disqualify it.
- Trace delegating helpers transitively to a native, adopted-library, or established owner operation,
  including unchanged links reached from the changed code. Rule on the connected path as one unit,
  recording its net operation, the origin of each operative input, and the work performed by every
  layer.
- Classify each layer by those input origins. Relay work uses operative inputs supplied by its callers
  and only prepares, guards, forwards, or reshapes the same operation. Owner work derives, validates,
  selects, or constructs inputs or configuration its callers do not supply.
- Collapse relay layers; reference count, caller count, tests, descriptive names, and uncommitted
  exports do not retain one. Every collapse must pass the direct-expression keep conditions and
  caller-cost test in `docs/code-organization.md`. Move owner work inward toward the nearest established
  owner operation under the configuration-surface rules in `docs/code-organization.md`.
- A project-owned terminal operation is generic when multiple owning units consume it and the setup
  under consideration belongs to only one of them; that terminal cannot absorb the unit-specific setup.
  Retain the closest factory, adapter, or step-definition boundary when moving the setup inward is
  blocked and moving it outward would fail the caller-cost test. One caller does not invalidate that
  owner work.
- A committed public boundary turns removal of that link into a user ruling; the rest of the path is
  still inventoried.
- Re-run the trace after every collapse until no relay remains and every retained layer performs owner
  work.

## Verification and handoff

- Run formatting, TypeScript, lint, and the narrowest relevant existing tests per `AGENTS.md` and the
  applicable technical reference. Behavior that did not change gets no new test to pin the cleanup.
- Re-read the final diff and run the checklist again against the result.
- Report meaningful edits, unresolved user rulings, material residual risk, and any failed or skipped
  check.

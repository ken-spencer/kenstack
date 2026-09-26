# Cleanup

Use this checklist with the cleanup skill when cleanup is explicitly requested or required by the
development workflow. The skill owns invocation, Git scope, delegation, and edit eligibility; this
reference supplies Kenstack's engineering checks.

## Scope and posture

- Preserve unrelated work and use the selected diff and nearby context. Expand to the full project only
  on request or when an affected owner cannot otherwise be found.
- Apply only locally proven changes that preserve behavior, caller-visible types, ownership, and public
  contracts. A clean compile proves compatibility, not equivalence.
- Leave equally clear forms alone. Report product, API, design, ownership, and naming decisions for
  implementation or the user's ruling.

## Checklist

- Ownership, owner APIs and component duplication are review's checks (`docs/review.md`); cleanup
  does not repeat them.
- **Helpers and indirection:** Inspect changed helpers, wrappers, mappers, normalizers, and local
  bindings, including destructured bindings and callbacks. Apply ownership, capability order,
  direct-expression keep conditions, and the helper ladder in `docs/code-organization.md`. Trace
  delegating layers through the
  call-path collapse procedure below.
- **Redundant lookups:** Within one function or component, take each value from a call it already
  makes when that call returns it, rather than adding a second lookup. Extend that call's owner only
  when every one of its callers should receive the value. Separate functions and components each load
  what they need; never move a load into a parent to pass it down.
- **Aliases and renamed bindings:** Inspect every new or changed import alias, destructuring rename,
  pass-through binding, and local alias. Use the canonical source name directly; keep a rename only
  when it resolves an actual collision or marks an explicit lifecycle boundary, and remove one that
  only introduces a synonym or repeats surrounding context. Cleanup never invents a replacement name;
  when the canonical name looks inaccurate or misleading, flag it for the user's ruling.
- **Names:** Apply `docs/naming.md` and the reserved runtime vocabulary in
  `docs/runtime-boundaries.md`. Trace changed cross-file models for vocabulary drift. Report factual
  or convention violations for the user's ruling; harmless synonyms, readability preferences, and
  qualifiers distinguishing live variants are not findings. Cleanup never renames.
- **Declarations and exports:** Inspect production references for changed declarations. Apply
  `AGENTS.md`'s export gates and `docs/code-organization.md`'s local-binding rules; reference counts
  alone do not decide other declarations. Committed public APIs (see `AGENTS.md`) remain externally
  consumed.
- **Types:** Apply the `Type cleanup` section of `docs/typescript.md`, including types in untracked
  files. Use owner inference or derive from the
  canonical producer; hand-write a type only for an intentional independent contract.
- **Invariants and defensive code:** Inspect each new or changed blocking guard. Its condition and
  message must describe the same restriction, and every blocked state must make the message true.
  Remove a fallback, type check, resolved-value alias, or nullability branch once routing, loading,
  schema validation, or an earlier guard establishes the state; enforce a required invariant once at
  its proper boundary.
- **Failure paths:** Inspect each new or changed `catch` block and every fallback reached because an
  operation failed. Keep it only when it rethrows the failure, translates it into a defined domain or
  public failure state and reports it as `docs/error-reporting.md` requires, or implements an
  already-authorized degradation with an explicit caller-visible result and a concrete product reason.
  An unexpected failure never becomes success, absence, or an empty value; a degradation not already
  established is flagged for the user's ruling.
- **Accessibility:** Apply the accessible-control-name rules in `docs/components.md` to every new or
  changed `role` and `aria-*` attribute, keeping only necessary and accurate semantics that native
  markup or visible content does not already supply.
- **Explanatory text:** Apply the code-comment rule in `docs/code-organization.md` to every new or
  changed code comment. Cleanup never removes or rewords interface text; development review covers
  interface lines the agent added.
- **Residual artifacts:** Inspect changed debug output, reviewer notes, stale TODOs, suppressions,
  commented-out code, placeholders, and every untracked file in scope. Keep a changed artifact only for
  a concrete current purpose. Remove a task-created untracked file with no production, test, tooling,
  or documented operational purpose; report any other unexplained untracked file for the user's ruling.
- **Public surface:** Committed Kenstack APIs are externally consumed; an authorized break follows
  `docs/upgrading.md`. For uncommitted APIs, update consumers directly and remove compatibility aliases.

A speculative suggestion is reported as such, never as required cleanup.

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
- Apply a collapse only when the skill's equivalence and ownership gates permit it; otherwise report
  it for implementation. Re-trace affected paths after an edit.

## Verification and handoff

- Run formatting, TypeScript, lint, and the narrowest relevant existing tests per `AGENTS.md` and the
  applicable technical reference. Behavior that did not change gets no new test to pin the cleanup.
- Recheck only the hunks cleanup edited.
- Follow `AGENTS.md`'s reporting policy; report only edits made and unresolved user rulings, never
  the items judged clean or kept.

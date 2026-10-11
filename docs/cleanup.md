# Cleanup

Use this checklist with the cleanup skill when cleanup is explicitly requested or required by the
development workflow. The skill owns invocation, Git scope, delegation, edit eligibility, the equivalence
bar, verification, and the report; this reference supplies Kenstack's engineering checks.

## Checklist

- Ownership, owner APIs and component reuse are review's checks (`docs/review.md`). For every new
  function, query, constant, check or hook, search Kenstack, the host and its packages for one that
  already does the job, and replace the new one with a call to it. Calling the same cached check or loader
  in separate functions or components is not a duplicate; each loads what it needs (see "Redundant
  lookups").
- **Helpers and indirection:** Inspect changed helpers, wrappers, mappers, normalizers, and local
  bindings, including destructured bindings and callbacks. Apply ownership, capability order,
  direct-expression keep conditions, and the helper ladder in `docs/code-organization.md`. Trace
  delegating layers through the
  call-path collapse procedure below.
- **Redundant lookups:** Within one function or component, take each value from a call it already
  makes when that call returns it, rather than adding a second lookup. Extend that call's owner only
  when every one of its callers should receive the value. Separate functions and components each
  load what they need; never move a load into a parent to pass it down. Flag every new or changed
  prop, parameter or option whose value the receiver can derive itself, from its own dependencies or
  a cheap call (a cached loader or session read included), such as a check that takes the current
  user's roles when it can read the current user.
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
  changed code comment, and to comments and doc lines elsewhere that the diff makes false, found by
  searching for the names it changed; cleanup updates or deletes them. Cleanup never removes or
  rewords interface text; development review covers interface lines the agent added.
- **Untracked files:** Remove a task-created untracked file with no production, test, tooling, or
  documented operational purpose; report any other unexplained untracked file for the user's ruling.

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

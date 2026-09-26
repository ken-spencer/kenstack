# Review

Use this checklist with the review skill for code review in Kenstack and its host sites. The skill owns
invocation and independence; this reference supplies the project checks. Review reports findings and
does not authorize implementation.

## Scope

- Inspect repository status first and preserve unrelated work.
- The default scope is the dirty files, the current diff, and the nearby context needed to understand
  them. Expand to the full project only on request or when an affected contract cannot otherwise be
  judged.
- Untracked files are in scope. Use staged and unstaged state to understand scope; Git state itself is
  a finding only when the request concerns staging or commit readiness.
- Read the applicable technical references routed by `AGENTS.md` before judging an unfamiliar boundary.
- Before judging a change, establish the requested behavior, existing contract, canonical owner, public
  surface, and relevant callers; an isolated hunk is judged in the context that decides the result.

## Review order

1. Check correctness, regressions, error handling, accessibility, authorization, cache behavior, and
   other observable behavior affected by the change.
2. Check whether verification matches the actual boundary and whether a missing check leaves a material
   risk.
3. Ask whether a simpler approach provides the same result and whether each abstraction or mechanism has
   concrete current value. A branch, case, or fallback that is unreachable or equivalent to another is
   a concrete maintenance cost, not a preference: report it with the equivalence that removes it.
4. Check the applicable ownership, import-organization, public-surface, and technical contracts routed by
   `AGENTS.md`, including the ownership trace in `docs/code-organization.md#unit-ownership`.
   For an affected reusable owner, inspect every new or changed configuration branch
   and its production call sites. Assess any cleanup ruling independently. One product
   capability stays behind one option unless a current caller requires each partial configuration;
   reject a surface that permits contradictory, incomplete, or drifting combinations. For an affected
   multi-step workflow, apply `docs/step-flow.md`. For a new site component, or a change that adds
   behavior to one, compare it with Kenstack and existing site components and rule on ownership
   against the component-reuse rules in `docs/components.md`; a similarity score, visual
   resemblance, or unresolved duplication candidate is not a finding.
5. Make each finding actionable: state the concrete defect or maintenance cost, support it with an
   execution path or evidence and its material consequence, and give the smallest useful correction.

A finding never asks for churn between equivalent forms, a rename of harmless locals, complexity moved
elsewhere, or a diff that is harder to review.

## Review-only boundary

- A review-only request changes no code; it reports findings and recommendations.
- Review does not repeat cleanup's declaration, helper, alias, naming, type, or guard inventories. When
  the diff shows that the cleanup pass was skipped or remains materially incomplete, report that once
  with representative evidence and route the work through `docs/cleanup.md`.
- Requested fixes enter the implementation workflow; cleanup follows its own edit limits. Review
  only the resulting changes and affected contracts again.

## Verification

Assess existing verification and identify material gaps. Run checks only when requested or needed to
resolve a concrete evidence gap; entering final review alone does not require rerunning them. Use browser
inspection when code cannot establish visible behavior. Follow `AGENTS.md` for test and build limits.

## Report

- Lead with findings ordered by severity, with precise file and line references.
- Put assumptions or open questions after the findings, followed by a short change and verification
  summary.
- When no meaningful findings remain, say so directly and identify only material residual risk or
  unverified boundaries.
- Report the checklist or staging state only when the user asked for it.

# Review

Use this checklist with the review skill for code review in Kenstack and its host sites. The skill owns
invocation, scope, independence, the cleanup boundary, and the report; this reference supplies the
project checks. Expand past the diff and nearby context only on request or when an affected contract
cannot otherwise be judged.

## Review order

1. Check correctness, regressions, error handling, accessibility, authorization, cache behavior, and
   other observable behavior affected by the change.
2. Check whether verification matches the actual boundary and whether a missing check leaves a material
   risk. Use browser inspection when code cannot establish visible behavior.
3. Ask whether a simpler approach provides the same result and whether each abstraction or mechanism has
   concrete current value. A branch, case, or fallback that is unreachable or equivalent to another is
   a concrete maintenance cost, not a preference: report it with the equivalence that removes it.
   A guard whose comment names no path that reaches it, or whose named path an access check, step
   rule, schema or loader already blocks, is such a branch. Code reshaped to make TypeScript accept it
   (a cast, a bypassed owner, exported internals, a copied derivation) is such a mechanism when a fix at
   the inference source would remove it: report it with that fix.
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
5. Report code outside Kenstack (a site, payments) that performs a Kenstack mechanism's job — access
   or session checks, refusal codes or messages, store adoption, carrying a value between two
   Kenstack ends — as a finding, with the declarative
   Kenstack shape that replaces it. It goes to the user for a decision, not to a local fix.

A finding never asks for churn between equivalent forms, a rename of harmless locals, complexity moved
elsewhere, or a diff that is harder to review. When the diff shows the cleanup pass was skipped, route
that referral through `docs/cleanup.md`.

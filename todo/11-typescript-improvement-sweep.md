# TypeScript improvement sweep

Status: requested by Ken, 29 September 2026. Launch only when Ken asks, after his presentation. A
parallel run of Opus workers.

## Goal

Review all committed TypeScript in Kenstack, Civic and payments for places where the types can be
made simpler or more honest, and prove each improvement with a spike before proposing it. This
applies the "Ask first" type-machinery rule and its spike step (`kenstack/AGENTS.md`) to existing code,
not just new work.

## What to look for

- Casts and assertions (`as`, `as unknown as`, `as never`, non-null `!`), and whether each states a
  fact TypeScript cannot infer or papers over inference that could be fixed at its source.
- Hand-written types that restate what a query, schema, builder or function already infers.
- Conditional and mapped types, generic parameters and overloads that exist only to satisfy the
  compiler.
- Annotations that restate inference, and exports of types nothing outside the file needs.
- Patterns found in the 28–29 September 2026 work: `omit()` folding keys into an index signature
  (destructure instead), a generic body reading the constraint instead of the argument, option order
  changing inference (prefer plain objects over callbacks where the callback only passes a value the
  caller already has), and `defineX` identity helpers versus building at a later internal stage.

## Method

1. Split the committed code into independent areas (Kenstack admin, auth, forms, db/queries, StepFlow,
   fields, lib; Civic modules and features; payments) and give each to its own Opus worker, read-only.
   Each returns candidates with file:line, what it is, and the suspected simpler form.
2. For each candidate, a worker spikes the change on copies under `tmp/`, with a TypeScript run over
   all three repositories and a check that can fail. Workers change no product code.
3. Group the results: proven improvements with no new machinery (safe to build), improvements that
   change a public API or keep some machinery (for Ken), and candidates that cannot improve (record
   why, briefly, so they are not re-proposed).
4. Ken rules on the second group. The proven ones are built through the normal development workflow,
   with Opus and Astra review.

## Output

One report ranked by value: what each change removes, its spike folder, the tsc result, and whether
it touches public API.

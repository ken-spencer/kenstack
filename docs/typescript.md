# TypeScript Reference

Consult this reference before adding a named type or interface, organizing or moving types, reviewing
or cleaning type code, changing a generic or overload, adding a type predicate or assertion, or solving
an inference or compiler problem.

## Earn every type

- The best type is no type. Start with inference and add a type only when it protects a necessary
  contract the inferred type does not express.
- Infer internal values, function bodies, builder results, schemas, and configuration.
- Use the inference supplied by native operations, canonical owners, and adopted libraries directly; a
  type alias, wrapper, annotation, overload, or generic that only preserves, renames, or reshapes that
  inference adds nothing.
- Name a type when it defines an exported contract a current consumer must reference or protects an
  external, schema, generic, or library boundary that inference does not express.
- Remove a type that names a one-use object shape, mirrors a value its owner already infers, or exists
  only to silence a diagnostic created by awkward code.
- Derive from canonical owners with `typeof`, `ReturnType`, `Parameters`, Zod input and output types,
  and table or builder inference; an existing contract has one version.
- When an inferred value needs an exported type name, export a type derived from its canonical owner.
  Hand-write the type only for an intentional contract independent of that producer.

  ```ts
  export async function loadItems() {
    return db.select({ id: items.id, name: items.name }).from(items);
  }

  export type Item = Awaited<ReturnType<typeof loadItems>>[number];
  ```

## Carry inference across boundaries

- Let the canonical producer infer its return type. When another runtime, module, or layer needs a named
  type for that value, export a type derived from the producer and import it with `import type` where
  appropriate. This applies to queries, loaders, factories, parsers, builders, schemas, and library-owned
  operations:

  ```ts
  export async function loadCheckoutOptions() {
    const items = await loadAvailableItems();

    return { items };
  }

  export type CheckoutOptions = Awaited<ReturnType<typeof loadCheckoutOptions>>;
  ```

- Derive a nested or collection item from that exported result when a consumer needs it, such as
  `CheckoutOptions["items"][number]`. The producing value stays the canonical owner and every consumer
  type derives from it.
- When a boundary transforms or serializes the value, that boundary's output is the canonical producer
  and the consumer type derives from its return value. When a schema owns the boundary shape, derive the
  consumer type from the schema output.
- Hand-write a boundary type only for an intentional contract independent of the current producer, and
  apply it where the boundary value is constructed so the producer is checked against it.
- Prefer a type owned by the source API over a consumer-authored mirror; when derivation would need a
  long chain of utility types, a small explicit public contract is the clearer and more stable
  authority.

## Preserve boundary information

- `mocks/app/` supplies runtime-safe standalone bindings for the `@app/*` paths Kenstack imports. It is
  a compile and test harness, not the authority for a host's schema-aware or capability-aware types.
  Keep each mock structurally aligned with its host contract, keep the public contract as strong as the
  host needs, and verify it in a representative host.
- Every runtime branch represents behavior that can occur. When an upstream type permits a state the
  runtime contract rules out, fix the producing contract and its result type; a fallback, guard,
  mapper, wrapper, or alternate value added for the type alone is appeasement.
- When a framework, field lifecycle, route, action, hook, or component owns a callback, context,
  options, or props type, use or improve that contract; a local lookalike or a `Pick` alias that renames
  part of it is a second owner.
- Keep required lower-level values required, and validate optional runtime configuration at the
  boundary that reads it, so the contract stays strong and no later code throws for a missing value.
- Name a public type for the concept callers pass, receive, or implement. `Resolved`, `Built`, `Patch`,
  or `Defaults` earn their place only when that state changes how callers use the value. Before renaming
  a committed type, inspect its consumers and verify a representative host.
- When a canonical factory, parser, resolver, compiler, schema, or query produces a named state, derive
  its type from that producer and construct values through it; a manually assembled lookalike that
  happens to satisfy the exported output type is not that state.

## Keep types with their owner

- A function's parameter and result contracts belong beside that function.
- A public type belongs beside the public value or function that owns it.
- A shared predicate belongs beside the named domain type it narrows; a one-off structural check stays
  inline at its use.
- A type stays with its owner however many files import it; there is no generic `types.ts` bucket.

## Generics and type-level code

- Add a generic only when current callers need a variation that inference should preserve.
- Supply an explicit generic argument only when it corrects or constrains inference.
- Reserve mapped and conditional types for public contracts where they materially improve caller
  safety.
- Keep overloads only for genuinely distinct caller contracts. They are public declarations, not proof
  of a correct implementation, and never a way to hide an assertion, an inconsistent implementation
  shape, or an inference gap.
- Prefer a direct concrete function when a generic makes the implementation harder to follow.

## Runtime guards

- Use built-in narrowing such as `typeof`, `Array.isArray`, `instanceof`, and `in` when it expresses the
  complete check clearly at the call site.
- Use `isRecord` from `src/lib/isRecord.ts` when an unknown value must be a plain string-keyed object;
  it is the shared object guard for JSON, form, and configuration records.
- When a registry is accessed by arbitrary runtime keys and every value shares one useful contract,
  annotate the canonical declaration as a `Record` and perform the direct lookup:

  ```ts
  const registry: Record<string, Value | undefined> = { ... };
  const value = registry[key];
  ```

  The broader type goes on the canonical declaration, never on a copy of the registry.

- When callers need the registry's literal keys or key-specific value types, keep its exact inferred
  type and use `hasKey` from `src/lib/hasKey.ts` for a broad runtime key before the direct lookup:

  ```ts
  if (hasKey(registry, key)) {
    const value = registry[key];
  }
  ```

  This preserves the registry's exact key-to-value types, and the same predicate serves every
  exact-object lookup.

- Keep a domain predicate beside the type it narrows when the check proves a domain fact such as a
  module capability, field mode, or external error shape.
- Every type predicate performs a runtime check strong enough to establish its declared target.

## Assertions and narrowing

- Resolve a diagnostic from its owner outward: correct the producer; reuse or derive the owner's type;
  construct the value in a typed context; use `satisfies` when a conformance check should retain
  inferred detail; narrow with control flow, a proven predicate, or schema parsing at a runtime
  boundary; cast only when the type system cannot express an invariant already established elsewhere.
- A clean compile proves compatibility, not equivalence. Before changing or removing an annotation,
  assertion, or cast, compare the caller-visible inferred type and the runtime value with the intended
  contract; contextual typing, literal widening, optionality, nullability, and mutability can change
  while compilation still succeeds.
- Use an assertion only to bridge a verified boundary, and keep it next to the runtime fact that
  justifies it; another annotation is not evidence. Trace the producer and compare its complete output
  with the target, including required and optional properties, discriminants, nullability, mutability,
  and nested values, and assert only the smallest target the established invariant supports.
- Start untrusted values as `unknown` and narrow them to the required contract. Fix inference problems
  at the producer or contract; `any`, a broad annotation, a non-null assertion, an `unknown` double
  cast, and a hand-written witness type or global type fragment added to break an inference cycle all
  erase information.
- Use `satisfies` to check a value without widening its inferred type and `as const` only to preserve
  literals already present; omit either when the surrounding typed call or declaration already performs
  the same check or preserves the same information.
- When dynamic construction cannot retain an exact mapped return type, localize one assertion at the
  construction boundary and test the invariant.

## Type cleanup

- A split into sub-types is earned only when the parts are independently reused, name owned domain
  concepts, form meaningful union members, or are large enough that inlining would bury the boundary. A
  type derived from a canonical owner stays derived; the derivation preserves its source of truth.
- Build a complete inventory of every new or changed named type, interface, generic parameter,
  overload, predicate, annotation, and assertion in the cleanup scope, including untracked files.
  Resolve each entry by using its owner's inference directly, deriving a consumer-facing type from its
  canonical producer, or retaining an intentional independent contract and applying it where that
  boundary value is constructed. Cleanup is complete only when every entry has one of these rulings.
- For every value passed between runtimes, modules, or layers, trace it from its canonical producer to
  its consumers and verify that each consumer-facing type follows `Carry inference across boundaries`
  or is an intentional independent boundary contract.
- For every type newly exported in a dirty-file diff or exported from an untracked file, verify that a
  current in-repository consumer imports and uses it outside its defining file; otherwise remove the
  export and keep the type local.
- Keep deliberate compile-time contract fixtures under `tests/types/`, where `tsc` checks them without
  presenting them as runtime tests.
- Delete compatibility aliases and duplicate type surfaces for uncommitted APIs and update their call
  sites directly. Committed public types are externally consumed; document an authorized break per
  `docs/upgrading.md`.

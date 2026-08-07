# TypeScript Reference

Consult this reference before adding a named type or interface, organizing or moving types, reviewing
or cleaning type code, changing a generic or overload, adding a type predicate or assertion, or solving
a TypeScript inference or compiler problem.

## Earn every type

- Prefer inference for internal values, function bodies, builder results, schemas, and configuration.
- Name a type when it defines an exported contract, is reused meaningfully, clarifies a noisy boundary,
  or protects a real external, schema, generic, or library boundary.
- Remove a type that names a one-use object shape, mirrors a value already inferred by its owner, or
  exists only to silence a diagnostic created by awkward code.
- Derive from canonical owners with `typeof`, `ReturnType`, `Parameters`, Zod input/output types, and
  table or builder inference. Do not maintain a second handwritten version of an existing contract.
- When an inferred value needs an exported type name, export a type derived from its canonical owner
  rather than creating a parallel handwritten shape. Handwrite the type only when it is an intentional
  contract independent of that producer.

  ```ts
  export async function loadItems() {
    return db.select({ id: items.id, name: items.name }).from(items);
  }

  export type Item = Awaited<ReturnType<typeof loadItems>>[number];
  ```

## Preserve boundary information

- `src/deps/mock.ts` is a harness for compiling Kenstack in isolation, not the authority for a host's
  schema-aware or capability-aware types. Do not weaken a public contract to fit the mock; verify it in
  a representative host.
- When a framework, field lifecycle, route, action, hook, or component owns a callback, context, options,
  or props type, use or improve that contract. Do not create a local lookalike or a `Pick` alias that
  merely renames part of it.
- Keep required lower-level values required. Validate optional runtime configuration at the boundary
  that reads it instead of weakening the contract and throwing later.
- Name a public type for the concept callers pass, receive, or implement. Names such as `Resolved`,
  `Built`, `Patch`, or `Defaults` are useful only when that state changes how callers use the value.
  Before renaming a committed type, inspect its consumers and verify a representative host.
- When a named state is produced by a canonical factory, parser, resolver, compiler, schema, or query,
  derive its type from that producer and construct values through it. Do not manually assemble a
  lookalike merely because it satisfies the exported output type.

## Keep types with their owner

- A function's parameter and result contracts belong beside that function.
- A public type belongs beside the public value or function that owns it.
- A shared predicate belongs beside the named domain type it narrows. Keep one-off structural checks
  inline at their use.
- Do not create a generic `types.ts` bucket or move a type away from its owner merely because several
  files import it.

## Generics and type-level code

- Add a generic only when current callers need a real variation that inference should preserve.
- Keep mapped and conditional types for public contracts that materially improve caller safety. Do not
  use them to decorate simple internal code.
- Treat overloads as public declarations, not proof that an implementation is correct. Do not use an
  overload or helper merely to hide an assertion or inference gap.
- Prefer a direct concrete function when a generic makes the implementation harder to follow.

## Runtime guards

- Use built-in narrowing such as `typeof`, `Array.isArray`, `instanceof`, and `in` when it expresses the
  complete check clearly at the call site.
- Use `isRecord` from `src/lib/isRecord.ts` when an unknown value must be a plain string-keyed object.
  This is the shared object guard for JSON, form, and configuration records.
- When a registry is accessed by arbitrary runtime keys and every value shares one useful contract,
  annotate the canonical declaration as a `Record` and perform the direct lookup:

  ```ts
  const registry: Record<string, Value | undefined> = { ... };
  const value = registry[key];
  ```

  Put the broader type on the canonical declaration rather than copying the registry into another
  variable with a broader annotation.

- When callers need the registry's literal keys or key-specific value types, retain its exact inferred
  type. Use `hasKey` from `src/lib/hasKey.ts` for a broad runtime key, then perform the direct lookup:

  ```ts
  if (hasKey(registry, key)) {
    const value = registry[key];
  }
  ```

  This preserves the registry's exact key-to-value types, and the same predicate serves every
  exact-object lookup.

- Keep a domain predicate beside the type it narrows when the check proves a domain fact such as a
  module capability, field mode, or external error shape.

## Assertions and narrowing

- Resolve a diagnostic from its owner outward: correct the producer; reuse or derive the owner's type;
  construct the value in a typed context; use `satisfies` when a conformance check should retain inferred
  detail; narrow with control flow, a proven predicate, or schema parsing at a runtime boundary; cast only
  when the type system cannot express an invariant already established elsewhere.
- A clean compile proves compatibility, not equivalence. Before changing or removing an annotation,
  assertion, or cast, compare the caller-visible inferred type and the runtime value with the intended
  contract; contextual typing, literal widening, optionality, nullability, and mutability can change while
  compilation still succeeds.
- Use an assertion only to bridge a verified boundary, and keep it next to the runtime fact that
  justifies it.
- Start untrusted values as `unknown` and narrow them to the required contract. Fix inference problems
  at the producer or contract instead of erasing information with `any`, a broad annotation, a non-null
  assertion, or an `unknown` double cast.
- Use `satisfies` when a value should be checked without widening its inferred type. Use `as const` only
  to preserve the literals already present. Omit either construct when the surrounding typed call or
  declaration already performs the same check or preserves the same information.
- When dynamic construction cannot retain an exact mapped return type, localize one assertion at the
  construction boundary and test the invariant. Do not scatter casts through the implementation.

## Type cleanup

- Review every named type, interface, generic parameter, overload, predicate, annotation, and assertion.
  Keep only those that protect a current contract or make the code easier to understand.
- Keep deliberate compile-time contract fixtures under `tests/types/`, where `tsc` checks them without
  presenting them as runtime tests.
- Delete compatibility aliases and duplicate type surfaces for uncommitted APIs; update their call sites
  directly. Treat committed public types as externally consumed and document authorized breaks in
  `docs/upgrading.md`.

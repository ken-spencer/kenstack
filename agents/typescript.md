# TypeScript Instructions

Read this before adding or changing type aliases, interfaces, overloads, generic arguments, casts, explicit return annotations, or type-heavy helper APIs.

## Core Principle

- Prefer inference wherever it keeps the code clear.
- A type should preserve useful information from a real boundary. Do not replace a specific schema, query, helper, or config shape with `unknown`, `Record<string, unknown>`, `object`, or another broad placeholder unless the source is genuinely unknown at that boundary.
- Treat every new local `type` alias, interface, overload, generic argument, explicit return annotation, and cast as suspect until it earns its place.
- Do not build top-of-file type blocks by habit. Keep one-off private object shapes at the function boundary.
- Do not move complexity into types to make awkward runtime or API shapes seem cleaner. Prefer changing the value/API shape so inference works naturally.
- Do not widen an inferred builder, schema, or configuration result to a broad exported type to suppress `TS7022`, circular initializer inference, or a similar type error. Trace and fix the dependency cycle or type the narrow callback/capability boundary that causes it; a broader variable annotation only hides the underlying design problem.

## Call-Site Names And Rename Safety

- Judge a shared or exported type name where callers import and use it. Name the API or domain concept the value represents to them, not how the owning implementation constructs, merges, resolves, or stores it.
- Use names such as `Patch`, `Defaults`, `Resolved`, or `Built` only when that state changes how callers use the value. If the distinction exists only inside the implementation, keep it private, inline it, or rely on inference.
- When designing an API, avoid making callers participate in internal assembly, merging, filling, or normalization. Prefer a domain-shaped input that callers can supply directly, and keep construction plumbing inside the receiving implementation.
- Utility types such as `Partial<T>`, `Required<T>`, `Pick<T, ...>`, and `Omit<T, ...>` are useful when they accurately describe what callers are intentionally doing. Do not bake them into a public boundary merely because they match an intermediate implementation state.
- Do not mechanically replace an awkward utility type with its opposite or another construction-state alias. First identify the caller-facing contract, then let the receiving boundary perform and type any internal merge.
- An implementation change does not by itself justify renaming a type. First remove the annotation and run TypeScript. If an explicit boundary remains necessary, reuse the nearest existing caller-facing contract or capability type before introducing a new name.
- Before renaming a shared or exported type, search every consumer and read the old and proposed names at the import, annotation, callback, or configuration site. Rename only when the old name is materially misleading about the public contract and the new name makes a current caller easier to understand.
- Treat downstream compilation as part of the rename safeguard. Check Kenstack and a representative host, update migration guidance for a shipped API, and update uncommitted consumers directly without adding a compatibility alias.

## Useful Explicit Types

Keep an explicit type when it:

- Defines an exported/public contract.
- Is reused in more than one meaningful place.
- Documents a real domain concept.
- Clarifies a noisy function boundary.
- Protects an external, generic, schema, Drizzle, React Hook Form, or untyped API boundary.
- Narrows an unsafe external value through validation or a real type guard.

Remove or inline a type when it:

- Names a one-use object shape that inference handles.
- Mirrors a value already inferred by Zod, Drizzle, a builder, a hook, a component prop, or a helper return.
- Only renames a direct row/result/response/options shape, such as `SavedRow`, `Result`, `Response`, `Options`, `Query`, or `Callback`.
- Exists only to quiet TypeScript after an awkward local API shape or broad placeholder type.
- Broadens a contract so consumers can ignore fields they do not support.
- Is a compatibility alias for uncommitted work.
- Uses `Pick`, `Omit`, mapped types, conditional types, `ReturnType`, or `Parameters` only to recreate a simpler type that inference already knows at the value boundary.

## Information-Preserving Boundaries

- Kenstack's `src/deps/mock.ts` is only a harness for compiling and checking Kenstack in isolation. It is not the source of truth for consumer-facing `@app/deps` types. Judge exported contracts and extension points from a consuming application's real tables, schema, configuration, and capabilities, then verify them in a representative host. Never weaken a type to the mock's shape or replace an exact consuming-app type with a schema-less library base merely so the standalone Kenstack check passes.
- When a consuming-app value combines independent concerns and creates a type cycle, derive the contract from the narrower real owner, such as the application's table registry for its database type, instead of typing through an aggregate dependency object that also owns modules. Do not break the cycle with a broad annotation, cast, handler wrapper, generic witness, or hand-written `Pick` of currently used methods. The fix must preserve the consuming application's existing inference and capabilities.
- Before typing a helper that is passed to a framework, field lifecycle, route, action, hook, or other common API, check whether that API already owns a handler, context, options, props, or callback type. Use that shared contract, or improve it at the shared API boundary, instead of redeclaring common parameters such as `db`, `value`, `params`, `request`, `user`, or option bags at each call site.
- Do not satisfy the shared-contract rule by hiding the repeated shape behind a local alias such as `type SelectDb = FieldLoadContext["db"]` or `type SaveArgs = Pick<...>`. If the helper is a framework/lifecycle callback, give it the callback shape through the shared handler/context. If it is not a callback, either let the caller infer the shape or use the source contract directly at the parameter; do not create a local alias that only renames one property of a broader API.
- When a library type is schema-aware, table-aware, form-aware, or config-aware, derive the type from the actual schema, table, form, or config value rather than from the library's broad base type.
- Before declaring an object shape, check whether the stable part of that shape is already owned by a schema, field value, table model, component prop, helper return, or other source contract. Derive from that source-owned type and override only the fields that genuinely differ at this boundary.
- Use `Omit<T, ...> & { ... }` only when `T` is a real source-owned contract and the override list is small. Do not use utility types to manufacture a type from a broad placeholder, hide uncertainty, or avoid fixing the value shape.
- A narrowed capability type is useful only when it preserves the relevant input/output information. A `Pick` from a broad or unknown base type usually creates fake flexibility instead of a meaningful contract.
- Do not hide uncertainty behind generic helper names. If a value is unknown, validate or narrow it at the boundary; if it is known, let the source value carry the type.
- Prefer schema-derived types for validated data, such as `z.input<typeof schema>` and `z.output<typeof schema>`.
- For Drizzle queries, prefer explicit selected fields over select-star plus result casts.
- For fetcher results, use the existing discriminated union and let `result.status === "success"` narrow the success shape.
- Do not make required values optional in lower-level APIs just to throw runtime errors when they are missing. Let TypeScript describe the real requirement and validate optional runtime configuration at the boundary that reads it.

## Inference Workflow

- When reviewing type-heavy code, first remove the explicit type, generic argument, return annotation, or cast. Restore only the smallest piece that fixes a real boundary or readability problem.
- Let function return types infer when the implementation already expresses the shape clearly.
- Inline small private object parameter types at the function boundary.
- Derive broad consumer types from the source value when a named type is truly needed, such as `ReturnType<typeof builder>`.
- Prefer `satisfies` for validating configuration without forcing a return or variable annotation.
- Avoid using `satisfies` in a way that makes callers acknowledge an internal construction shape such as `Partial<ResolvedThing>`. Prefer validation against the caller-facing contract or at the internal receiving boundary.
- Inline typed configuration objects at the typed call site so contextual typing and excess property checks work there.
- Avoid explicit generic arguments whenever call arguments, contextual typing, assignment targets, schemas, defaults, mutation variables, callbacks, props, or `satisfies` already infer a useful type. Hooks and components such as `useQuery`, `useForm`, `useFormContext`, and `useController` are common examples, not the whole rule.
- Do not add generic defaults that are identical to their constraints when an uninferred call already receives the same types. They do not improve inference, safety, behavior, or readability, so there is no reason to make the change.
- Keep hook or component generics only when the inferred type is wrong at a real boundary, not merely broader.

## Fake Precision And Mirrors

- Do not create types that restate a narrowed branch of an existing discriminated union, such as `FetchResult & { status: "success" }`.
- Do not create parallel result types that mirror Zod, Drizzle, fetcher, pipeline, builder, hook, or component output.
- Avoid `Resolved*`, `Defined*`, `Base*`, `*Row`, `*Result`, `*Response`, and `*Options` types unless the name represents a real domain concept or reused public contract.
- Avoid replacement ceremony: do not swap an obvious inline type for a maze of `Pick`, `Omit`, `ReturnType`, `Parameters`, or mapped types unless that derived type is reused or protects a real boundary.

## Casts

- Avoid casts. A cast usually means the design or generic boundary has gone off track.
- Before keeping a cast, try inference-friendly alternatives: explicit Drizzle selections, narrower inputs, `satisfies`, a type guard, schema parsing, or moving validation to the boundary.
- Keep necessary casts narrow and only at real generic, Drizzle, React polymorphic, or untyped external boundaries.
- Do not cast broad query results when selecting the consumed columns would infer the type.
- Do not add runtime throws or defensive branches only to satisfy TypeScript for states that the caller, route, schema, or module config should make impossible.

## External Types

- Before adding local declarations, shims, or wrappers for an external package, check whether the package ships types or the workspace already has them.
- If types are missing, check for a relevant `@types/*` package and install it when available.
- Use a narrow local boundary only when package/workspace types are not available.

## Review Pass

Before finalizing a touched TypeScript file:

- List every new or changed local type alias, interface, overload, generic argument, explicit return annotation, and cast.
- Remove each one unless it has a current, concrete reason under this file.
- Check whether each type preserves real information from a schema, table, form, helper, component, or external boundary. Remove types that only broaden to `unknown`, `Record<string, unknown>`, `object`, or other placeholders.
- Check helper signatures that repeat common framework/API context fields. Prefer the exported handler/context type or a schema-aware shared wrapper; if the shared type is too broad, fix or wrap that API once instead of declaring local lookalike contracts.
- Reject local aliases that merely rename a slice of a framework/API context. A `SelectDb`, `SaveContext`, `LoadArgs`, or `HandlerOptions` alias is still type ceremony when the function could accept the real lifecycle context or the API helper could be called directly.
- Check for fake precision and inferred mirrors: `Resolved*`, `Defined*`, `Base*`, `*Row`, `*Result`, `*Response`, `*Options`, branch aliases, and success/error aliases.
- Check for explicit generic arguments anywhere they appear. Remove them when the surrounding call, assignment, callback, schema, prop, or helper can infer the type; hooks and components are common examples, not a special case.
- Check for casts that can be replaced by inference, selection, validation, or a type guard.
- Check for replacement ceremony where derived utility types only recreate a simpler boundary.
- Check exported signatures and configuration sites for plumbing that makes callers assemble an implementation-owned shape. Utility types and construction language are fine when they describe the caller's real task; otherwise move that distinction behind the receiving boundary.
- For every renamed shared or exported type, confirm that the public contract changed or the old name was materially misleading, inspect every consumer, and compile both Kenstack and a representative host.
- If removing a type would require broader API churn or make the code harder to read, keep it and let the reason be obvious at the boundary.

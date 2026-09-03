# Naming

Consult this reference when naming or renaming a function, value, type, boolean, prop, state setter,
file, or folder, and for the reading order of a function body. The capability order that decides
whether a custom helper exists at all lives in `docs/code-organization.md`; reserved runtime-boundary
vocabulary such as the server-only meaning of `api` lives in `docs/runtime-boundaries.md`.

## Names and reading order

- Name a function, value, type, or boolean for what callers observe and the contract guarantees, in
  established owner, library, or domain vocabulary. A name is wrong when it overclaims behavior, hides a
  precise domain concept behind a vague container, is more verbose than an available established term,
  or leaves a boolean's true condition ambiguous at its call site.
- Name every behavior function with a specific action verb or a predicate prefix that makes its contract
  explicit at the call site: `load`, `save`, `build`, or `format` for actions; `is`, `has`, `can`, or
  `should` for boolean questions. Reuse an owner or library's established operation name when calling
  it directly. Components and other declarative definitions may keep the domain noun they represent.
- Reserve `get` for retrieving or selecting a value that already exists in the named source. A value
  derived from its inputs takes the established operation verb, such as `sum`, `count`, `calculate`,
  `format`, `build`, or `resolve`, preferring the native, owner, or adopted-library name when one
  exists.
- A boolean function that compares values begins with `is`, such as `isSameValue`, `isDateBefore`, or
  `isOptionMatch`. `compare` is reserved for a three-way comparator that returns ordering.
- Keep the same domain noun as a value crosses its producer, result type, response property, prop,
  query, and local variable. Add a qualifier such as `initial`, `cached`, `authoritative`, or
  `previous` only for a real lifecycle or behavioral distinction. A reader should understand the
  relationship between a value and its type without hovering through each layer; fix drift at the
  canonical producer and update callers directly.
- Filenames and folders are part of the same naming family. When renaming an internal concept, whether
  the user requested it or the agent is correcting a name it introduced in the current task, audit its
  owning path, exports, imports, tests, and local symbols together. Rename the path
  when it preserves obsolete vocabulary or a qualifier that no longer distinguishes a sibling concept or
  supported boundary; keep the qualifier when removing it would make the path ambiguous at an import
  site.
- Name a state setter `set` plus the exact state variable name (`activeStep`, `setActiveStep`). When a
  callback is the canonical setter because it coordinates several state changes or side effects, give
  that callback the `setActiveStep` name and a file-local implementation name to the raw setter it
  wraps. Reserve action names such as `advance`, `changeStep`, or `select` for functions whose domain
  meaning is broader than setting that one value; a raw setter never carries an action-shaped alias.
- Keep a caller-facing prop named for the domain value even when the implementation uses it to seed
  state or a cache; when the distinction helps inside the component, rename it while destructuring
  (`value: initialValue`) at the lifecycle boundary. Keep `initial` or `default` in a public API only
  when one-time or uncontrolled semantics are themselves a meaningful caller-facing distinction.
  `initial` is especially suspect in a Server Component, which has no persistent local lifecycle
  separating an initial value from a later one; pass the domain value to the client boundary and let
  that client implementation name its seeding behavior locally.
- A generic container word such as `State`, `Data`, `Info`, `Result`, or `Facts` stays only where it is
  already established domain or protocol vocabulary, paired with its existing specific noun such as
  `AuthState` or `SaveResult`.
- Apply a deletion test to every qualifier in a name: remove it when the remaining name still
  identifies the same value or behavior unambiguously at its owner and consumers; keep it only when
  removing it would merge live concepts, hide lifecycle or contract semantics, or make a supported
  boundary ambiguous. A word that repeats the feature, module, folder, type, mock source,
  implementation stage, or surrounding expression adds length, not specificity.
- Keep decision-defining facts, including authorization and current-user state, near the predicates
  they control, so a reader can follow required behavior, optional behavior, state transitions, and
  failure paths in reading order without tracing scattered flags or compensating effects.
- Keep optional behavior explicit: finish shared work, establish applicability once, then enter the
  enabled path with the values that path requires.

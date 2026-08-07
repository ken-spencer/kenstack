# Code Organization

Consult this reference for principles that apply across Kenstack and host sites. Repository and module
layouts are defined separately in `docs/kenstack-anatomy.md`, `docs/site-anatomy.md`, and
`docs/module-anatomy.md`.

## Unit ownership

- A definition belongs to the unit whose behavior or schema it configures, decided by what it defines
  and who consumes it — never by what it references. A product's `categoryId` field belongs to the
  product module even though it points at the category table: dependency does not transfer ownership.
- A consumer that displays another owner's data derives or references it; it does not redeclare the
  source contract. Aggregators and registries assemble owners without taking ownership from them.
- Resolving misplacement moves definitions across existing boundaries. It does not merge, split, or
  dissolve the units themselves. Unit structure is a product decision changed only with explicit
  authorization.

## Canonical ownership

- Identifiers, labels, options, mappings, statuses, schemas, and configuration belong to the closest
  unit that defines their meaning. Expose or derive them there instead of making a consumer maintain a
  synchronized copy.
- Registries assemble owners. They may add registry-specific behavior, but they do not redeclare facts
  already known by each registered value.
- When disagreement between two inputs can only produce an error or no-op override, remove the
  duplicate input and derive it from the canonical owner.
- Before creating a primitive, helper, component, schema, validator, or adapter, check whether its owner
  or the adopted library already provides the capability. Setup intrinsic to every use of an owner's API
  belongs behind that owner even with one current consumer; consumer-specific policy stays at the
  consumer. Extend the owner when behavior is shared; do not preserve a parallel implementation merely
  because the current surface was inconvenient.
- A factory, parser, resolver, compiler, or schema owns the values and states it constructs. Names such
  as `Defined`, `Resolved`, `Parsed`, `Validated`, and `Compiled` are construction-boundary signals:
  construct those values through their owner unless direct construction is explicitly supported.
- Do not stack a base value, schema, configuration, or helper with a one-off "enhanced" copy when the
  owner can be defined correctly where its required context is available. Keep a separate construction
  only when it has a different owner or absorbing it would broaden the canonical contract beyond current
  need.

## Direct expression

- When handling one optional value, use a direct lookup and explicit branch. Use collection operations
  only when the value is genuinely a collection, not to hide a zero-or-one decision.
- Omit a prop or option that exactly matches the consumer's declared default when omission and explicit
  presence have the same meaning. Pass it when it changes behavior or deliberately pins a policy that
  should remain stable if the default changes.
- Inline a one-use binding when its name only repeats the expression. Keep it when the name identifies a
  domain concept, preserves inference, coordinates several uses, or makes a genuinely complex expression
  easier to read.
- Construct a value as a complete literal when it is always complete; do not declare an empty array or
  object and immediately assemble it through mutation.
- Combine adjacent guards when the inner branch only returns, throws, continues, or breaks and the
  resulting condition still expresses one decision. Keep separate branches when they represent distinct
  decisions or failure reasons.

## Configuration surfaces

- Treat every prop and option as supported API. Begin with the default behavior owned by the
  implementation, then add configuration only when a current production caller needs a genuine
  variation. Do not pre-design controls for imagined future wording, styling, or behavior.
- Expose the smallest meaningful difference. Keep invariant labels, defaults, state transitions, and
  implementation details internal instead of making every internal value configurable.

## Type ownership

- A public entry point keeps its caller-facing parameter and result contracts beside the function. Keep
  intermediate construction and resolution types internal; continue deriving public value types from
  canonical schemas and tables.
- Prefer inferred internal types. Name and export a type only when it states a contract that consumers
  need to reference.
- A type describing a function's parameters or result belongs beside that function, regardless of how
  many files consume it. Consumers import it from the owner or derive it with `Parameters`, `ReturnType`,
  or `typeof`.
- A hand-written type predicate narrowing a shared named domain type belongs beside that type. Keep
  one-off structural checks local to their use.
- Derive contracts from canonical schemas, tables, and narrower owners. Do not introduce hand-written
  witnesses, widening annotations, casts, or global type fragments to break an inference cycle.

## Helper ladder

- With one caller, inline a helper unless its name hides genuinely complex work or marks a real policy
  boundary.
- With one consuming file, keep the helper file-local and unexported.
- A separate helper file requires multiple production consumers or a concrete runtime, tooling, or
  public-contract boundary. Tests are not production consumers and never justify a production export.
- Place an earned helper in the closest existing owner and role home. Use that owner's `lib` location
  only when no more specific documented home applies; do not create a shared folder because its name
  merely sounds plausible.

## File and folder shape

- Treat files directly under a host-facing namespace such as `admin/` or `fields/` as supported entry
  points. A namespace may designate an `internal/` folder for implementation that host applications
  must not import. Do not leave a private support file at the public namespace root, and do not assume
  an existing `lib/` folder is private unless its owner explicitly migrates it to `internal/`.
- Keep a standard kind as one file while one file is sufficient. Promote it to the same-named folder
  only when multiple owned files need to be grouped. Do not create a folder solely for one file or an
  index barrel.
- When several files form one unit, use the folder name for the concept and concise role filenames
  inside it. Do not repeat the concept in every filename when the shorter names remain clear.
- For internal moves, update consumers directly and delete the old path. Do not leave compatibility
  barrels, wrappers, aliases, or adapter imports unless a committed external contract requires them.
- Entry-point and public-surface files carry a short header stating their audience and export boundary.
  Omit it only when framework syntax or a documented fixed-entry surface determines both, and the file
  contains no additional exports. Name the actual importers and keep the file reserved for that boundary;
  do not route internal imports through a public entry point for convenience.
- Apply formatting only through the configured formatter and only within the touched scope.

## Names and reading order

- Name a function, value, type, or boolean for what callers observe and the contract guarantees. Do not
  use a name that overclaims behavior, hides a precise domain concept behind a vague container, or leaves
  a boolean's true condition ambiguous at its call site.
- Rename only when the current name is materially misleading or needlessly difficult to read. Do not
  rename for vocabulary preference or remove a qualifier that distinguishes another live variant.
- Keep decision-defining facts, including authorization and current-user state, near the predicates they
  control. A reader should be able to follow required behavior, optional behavior, state transitions,
  and failure paths in reading order without tracing scattered flags or compensating effects.
- Keep optional behavior explicit: finish shared work, establish applicability once, then enter the
  enabled path with the values that path requires.

# Code Organization

Consult this reference before adding or moving files, changing canonical implementation ownership, or
introducing a new folder or entry point.

## Feature Ownership

- Code under Kenstack must not import host-site modules directly, including `@/`, root `src/`, relative
  paths into a host application, or site module paths. Host dependencies flow through the explicit
  `@app/deps` or `@app/deps/*` boundary.
- Keep top-level files in broad feature folders, such as `src/admin`, reserved for primary public APIs and
  major entry points that should be easy to reference. Secondary implementation details, support
  constants, and internal UI adapters go in a subfolder such as `lib`, `components`, or another existing
  domain folder — but only after passing the helper ladder below: a helper with one consuming file stays
  file-local in its consumer, not in `lib`.
- Folders named `modules` are for actual module definitions and module-owned files. Do not put helper code
  that builds, loads, renders, or works with modules in `modules`; place that infrastructure under the
  feature it belongs to, such as `admin/moduleSettings`.
- Within a module, reserve `fields` for the primary record fields exported from `fields.ts`. Use a specific
  name for secondary field sets, such as `settingsFields`, so imports stay consistent and the role of each
  field set is clear.
- Field definitions, field helpers, field handlers, field lifecycle code, and field-based record save
  helpers belong in `src/fields`, not under `src/admin`. Admin may re-export field APIs for ergonomics, but
  the canonical implementation should stay outside admin when it can be used by non-admin workflows.
- Shared components live directly under `src/components`. Keep shared UI behavior in Kenstack-owned
  components with narrow APIs.

## Type Ownership

- `src/deps/mock.ts` is a standalone compilation harness, not the authority for consumer-facing
  `@app/deps` contracts. Do not weaken a real host's schema or capability inference to satisfy the mock.
- When an aggregate host dependency creates a type cycle, derive the contract from the narrower real
  owner, such as the host table registry, instead of widening the aggregate, casting it, or introducing a
  hand-written capability witness.
- Do not widen an inferred builder, schema, or configuration result to suppress `TS7022` or another
  circular-initializer error. Fix the dependency cycle or type the narrow callback boundary that causes
  it.
- A type that describes a function's parameters or result belongs in that function's file, beside its
  owner, no matter how many Kenstack files consume it. Consumers import it from the owner or derive it
  (`Parameters`, `ReturnType`, `typeof`) rather than pulling the type into `lib` or a types file. The
  helper ladder governs runtime helpers, not the types that state an owner's contract.
- A hand-written type predicate that narrows a shared, named domain type is part of that type's contract
  and lives beside the type's declaration, even while it has one caller — future consumers look for the
  guard where the type is. Keep one guard per narrowing: before writing a predicate for a type you do
  not own locally, look for the one already beside the type. One-off structural checks that narrow no
  shared named type stay local to their use.

## File and Folder Shape

- Entry-point and public-surface files, such as `admin/server.ts`, carry a header comment stating their
  public role and export boundary. Name importers concretely in headers — host applications, Kenstack
  code — never a relative word like "internal". Use enough lines to make the distinction explicit. For
  example:

  ```ts
  /*
   * Public entry point: the admin client-configuration API for host applications.
   * Export only supported host-facing APIs. Kenstack code imports non-public
   * implementation from its canonical files, not through this entry point.
   */
  ```

  Keep these files reserved for their boundary: do not add code or re-exports solely so other Kenstack
  files can import them; Kenstack code imports the owning module directly. The header governs exports,
  not implementation placement. File ownership is governed by the feature and helper rules above. Add
  this header only when the file exists primarily as a host-facing boundary, not merely because an
  implementation area exposes some utilities to hosts.

- Do not give a helper its own file until it has earned one: with a single caller, inline it; with a
  single consuming file, keep it file-local and unexported. A helper file is justified by multiple
  production consumers or a real boundary — test files are not consumers and never justify separation
  or an export — and it belongs in a folder whose existing files do the same kind of work, not one
  whose name merely sounds plausible.
- Do not create a folder just to hold a single file or an index barrel. Use a direct file, such as
  `admin/modules.ts` or `queries.ts`, unless the folder already groups multiple files that work together
  or the current change is adding those sibling files as part of the same feature. Do not add an index
  barrel only to preserve an import path.
- When multiple components or files are designed to work together as one unit, put them in a dedicated
  folder and avoid repeating the folder concept in each filename when the shorter names remain clear. For
  example, prefer `components/AdminShortcutLink/index.tsx` and
  `components/AdminShortcutLink/Client.tsx` over sibling files named `AdminShortcutLink.tsx` and
  `AdminShortcutLinkClient.tsx`.
- For internal moves, update internal call sites to the new owner and delete the old file. Do not leave
  old-path wrapper components, re-export files, or local adapter imports solely to preserve an internal
  path.

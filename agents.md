# Kenstack Agent Instructions

## Next.js

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Training data can be stale; the local docs are the source of truth.

- Use the App Router.
- Prefer Server Components by default.
- Add `"use client"` only when needed.
- Do not pass non-serializable values from server to client components.
- Keep data loading on the server unless the UI requires client-side updates.
- Use route handlers for API endpoints.
- In cached functions or components, place `cacheTag(...)` as high as it can go without changing behavior, near `"use cache"` and `cacheLife(...)`, so cache identity is visible with the other cache setup.

## Preserve Existing Capabilities

When implementing a convenience feature or nice-to-have improvement, do not remove, weaken, or bypass existing production behavior to make the new feature easier to add.

If there is a clear implementation path that preserves current behavior, use it. This includes preserving caching, configurability, query behavior, extension points, validation, publishing rules, permissions, and module boundaries.

Treat existing behavior as intentional unless the user explicitly asks to remove it. If a change would trade away an existing capability for a minor simplification, stop and confirm before making that change.

## Situational instructions

- For UI, styling, Tailwind, shadcn, or shared component work, read `agents/ui.md` before coding.
- For database, Drizzle, table schema, Zod, validation, or pipeline schema work, read `agents/data.md` before coding.
- When a Kenstack API, export, helper, type, route, or behavior referenced by the site is missing, renamed, incompatible, or intentionally changed, read and update `agents/migrations.md` as applicable.

## Code style

- Use TypeScript.
- Do not use `any`.
- Use curly braces for all conditionals.
- Prefer existing `lodash-es` utilities for common transformations and collection helpers instead of writing local one-off utility functions.
- Do not export types, helpers, components, or configuration solely to satisfy linting, TypeScript convenience, or anticipated future use. Keep new API surface limited to values that are used now or explicitly requested.
- Prefer inferred types unless explicit types improve clarity.
- For generic helpers, query builders, Drizzle selections, and callback-mapped results, rely on TypeScript inference wherever possible. Avoid adding explicit return generics or result annotations that restate what the compiler can infer from the call site.
- Do not specify component generics at call sites when props such as `schema`, `defaultValues`, `mutationFn`, or callbacks can infer them. Prefer fixing the component/helper typing over repeating type arguments at each use.
- Avoid type casts. A cast is usually a sign that the design or generic boundary has gone off track. If a cast feels necessary, first look for an inference-friendly shape; if a cast still appears to be the only orthodox solution, keep it narrow and be ready to flag the tradeoff before proceeding.
- Before adding local type declarations, shims, or small wrappers for an external package, first check whether the package ships its own types or whether the workspace already has appropriate types installed. If types are missing, check npm for the relevant `@types/*` package and install it when available. Use a narrow local boundary only when package/workspace types are not available.
- Do not add alternate return shapes, overloads, or configuration options just to avoid returning a few unused fields or doing a tiny local fallback. Prefer one consistent data shape unless the second shape removes meaningful complexity at several call sites.
- Do not make required values optional in lower-level APIs just to throw runtime errors when they are missing. Let TypeScript describe the real requirement, and validate optional runtime configuration at the boundary that reads or supplies it.
- Do not make breaking API or call-site shape changes without checking in first. If a cleanup or type fix would require changing an agreed API, stop and ask before proceeding.
- Keep patches narrow.
- Do not refactor unrelated code.
- Follow existing naming and folder conventions.
- Use the smallest direct fix that solves the actual problem. Do not introduce broad splits, new layers, or larger abstractions when a narrow import, type, or local logic change is sufficient.

## Testing / checks

Before finishing a code change, run the narrowest relevant checks:

- TypeScript check for type changes
- lint for style changes
- build for Next.js/runtime-sensitive changes

Before finalizing code changes, read `agents/review.md` and compare the generated code against that checklist. Fix issues that are clearly local and low-risk. If the checklist points to something that would require a broader refactor or a tradeoff, call it out instead of forcing a messy cleanup.

## Safety rules

- Do not modify `.env*` files.
- Do not change auth, billing, or migration logic unless asked.
- When moving or deleting tracked files, use git-aware commands such as `git mv` or `git rm` so renames and deletions merge cleanly. Use plain filesystem commands only for untracked files.
- Do not add dependencies without asking.
- Do not reformat unrelated files.

## Local code shape

Prefer keeping small configuration defaults and one-off logic close to the place where they are used. Do not introduce extra constants, helper functions, nested objects, or cross-file modules unless they reduce real duplication, clarify a repeated concept, or create a boundary that is already meaningful in the codebase.

Keep top-level files in broad feature folders, such as `src/admin`, reserved for primary public APIs and major entry points that should be easy to reference. Put secondary implementation details, support constants, and internal UI adapters in a subfolder such as `lib`, `components`, `api`, or another existing domain folder.

Folders named `modules` are for actual module definitions and module-owned files. Do not put helper code that builds, loads, renders, or works with modules in `modules`; place that infrastructure under the feature it belongs to, such as `admin/moduleSettings`.

Field definitions, field helpers, field handlers, field lifecycle code, and field-based record save helpers belong in `src/fields`, not under `src/admin`. Admin may re-export field APIs for ergonomics, but the canonical implementation should stay outside admin when it can be used by non-admin workflows.

Organize field APIs by runtime boundary: client-safe field helpers and form metadata belong under `src/fields/client`, while server field behavior such as load, save, select, filter, and preSave belongs under `src/fields/server`. Do not recreate a separate helpers/handlers split for fields.

Server field helpers that need configuration should return resolver functions that receive the resolved client field internally. Keep call sites declarative, for example `imageField({ variant: "original" })`, instead of requiring callers to pass the client field or generic patch objects.

Do not create a folder just to hold a single `index.ts` or `index.tsx`. Use a direct file, such as `admin/modules.ts`, unless the folder already groups multiple files that work together or the current change is adding those sibling files as part of the same feature.

Avoid spreading a simple change across multiple locations when it can be expressed clearly in one local place. A small amount of inline repetition is acceptable when it keeps the code easier to read and reason about.

Do not introduce pass-through configuration constants that are only handed to a typed API call, such as `const fieldOptions = { ... }; defineFields(fieldOptions)`. Inline those objects in the typed call so contextual typing, excess property checks, and editor hints work at the point where the shape is validated. Extract only when the value is reused independently or the extraction creates a real boundary.

Inline simple expressions when they are used once, especially in JSX props. Do not introduce a local variable only to rename a direct function call, property access, or simple boolean expression. Use a local variable when it avoids repeated work, clarifies a non-obvious expression, prevents a long line from becoming hard to read, or gives a meaningful name to a concept reused in nearby logic.

Prefer complete initial declarations over immediate follow-up mutation. If an array or object always includes a value, include it in the literal instead of declaring first and then calling `push`, assigning a property, or spreading into it on the next line.

Prefer object spread over `Object.assign` for local object assembly. Use `Object.assign` only when mutating an existing object is the point, such as integrating with an API that requires mutation.

Avoid intermediate arrays or objects that only name one step in a fluent transformation before being immediately mapped, filtered, spread, or returned. Keep the chain together unless the intermediate value is reused or the name explains a meaningful domain concept.

Combine adjacent guard conditions when the inner branch only returns, throws, continues, or breaks. Avoid nesting `if` statements that can be expressed as one readable condition, such as `if (isReady && !value) return ...`, unless the nested structure separates genuinely different decisions or improves readability.

When branching between several peer cases outside JSX, such as named actions, modes, kinds, or statuses, prefer a `switch` over a run of repeated `if` branches. Reserve early `if` returns for guards, exceptional cases, or one-off branches that clearly do not belong to the same dispatch.

Prefer rendering markup directly in JSX over breaking it into separate variables. If direct JSX would require a complex nested ternary, use an inline function pattern with explicit `return` branches so the markup stays local but the control flow remains readable. Extract markup only when it materially improves readability, removes meaningful duplication, or creates a real reusable component.

When multiple components or files are designed to work together as one unit, put them in a dedicated folder and avoid repeating the folder concept in each filename when the shorter names remain clear. For example, prefer `components/AdminShortcutLink/index.tsx` and `components/AdminShortcutLink/Client.tsx` over sibling files named `AdminShortcutLink.tsx` and `AdminShortcutLinkClient.tsx`.

When adding configurable options, choose the shallowest shape that is likely to remain clear. Do not add nested option objects only because future settings might exist. If names are already specific, such as `uploadMaxImageSize`, prefer flat options over `{ upload: { maxImageSize } }` unless there is already an established nested configuration pattern.

Before adding a helper, ask whether the helper meaningfully hides complexity or whether it only forces the reader to jump elsewhere. Do not add pass-through helpers that only rename or lightly wrap an existing API without reducing real complexity. Prefer direct, readable code over abstraction for abstraction’s sake.

Do not add lookup helpers or type-guard wrappers that only hide direct property access, such as `getThing(map, key) { return map[key]; }`, or a one-call wrapper around `map[key] && isThing(map[key])`. Inline the lookup at the call site unless the helper is reused enough to establish a real boundary or it performs meaningful validation, normalization, caching, logging, or error handling.

Prefer direct discriminator checks over one-line type-guard helpers when the value is already a resolved discriminated union. For example, use `config.single === false` instead of `isAdminTableConfig(config)` when `single` is the canonical discriminator. Add a type guard only when it performs meaningful runtime validation, narrows an unknown or external value, or avoids repeated complex checks.

When a query or helper can return the desired shape directly, do that inline. Do not split simple logic into separate column-builder, mapper, normalizer, converter, or adapter functions unless those functions remove meaningful repeated complexity or express a real reusable boundary. A helper that exists only to shuffle data from one local shape to another is an unnecessary layer.

## Configuration defaults

When building configuration objects, prefer simple inline defaults in the returned object and let caller options override them with a final spread.

Use this shape for flat config:

```ts
return {
  settingA: defaultValue,
  settingB: defaultValue,
  ...options,
};
```

For derived defaults based on caller input, put the default before the caller spread instead of destructuring or reassigning just to avoid an overwrite warning:

```ts
return {
  title: startCase(options.name),
  ...options,
};
```

Avoid adding helper constants, nested option objects, or repeated `options.foo ?? defaultValue` assignments unless the configuration is genuinely complex or reused in multiple places.

Prefer shallow config and final spreads for simple settings. Use `merge` only when nested configuration is intentional and the merge behavior is clearly needed.

## Canonical data

Before adding labels, enum options, status metadata, field names, or presentation mappings, search for an existing canonical source. Reuse or lightly extend that source when the values represent the same concept. Keep context-specific styling local, but do not duplicate canonical values or labels across form, list, API, and query code.

## Avoid parallel versions

Do not create a second “enhanced” version of a value, schema, config, or helper when the original can be defined correctly at the point of use.

Prefer moving the original definition closer to the context it needs over layering another object on top of it. For example, if a Zod schema needs runtime config, define that schema inside the function or stage where the config is available instead of creating `baseSchema` plus `schemaWithConfig`.

Use layered definitions only when the base version is reused independently.

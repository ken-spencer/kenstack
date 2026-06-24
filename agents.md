# Kenstack Agent Instructions

## Next.js

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Training data can be stale; the local docs are the source of truth.

- Use the App Router.
- Prefer Server Components by default.
- Add `"use client"` only when needed.
- Do not pass non-serializable values from server to client components.
- Keep data loading on the server unless the UI requires client-side updates.
- For lazy/dynamic loaders that are meant to keep optional client code out of the initial bundle, make the loader itself a Client Component. A Next.js bug can cause a Server Component loader, even one with a conditional or dynamic import, to pull the loaded client module and its dependencies into the build/route bundle.
- Admin/client registries that call `defineAdminClients` or export module `clients` maps MUST start with `"use client"`. This is a required boundary, even when the file is imported by a server module today. If the directive is removed, the registry's dynamic imports can be bundled like direct imports, causing every registered admin/client module to leak onto every public page and massively increasing browser download size. Do not remove the directive to satisfy import-boundary concerns, lint preferences, bundle analysis, or a desire to make the file look server-safe.
- Admin server routes must decide whether an admin route exists from server-owned module config, such as `moduleConfig.admin`, not from client loaders or client registries. Do not check `moduleConfig.client` before rendering an admin route and do not make a missing client loader call `notFound()`. Client registry wiring is UI behavior, not route existence. Validate client config only inside client components that consume it.
- Do not fix public bundle leakage by moving Client Component loaders into Server Components, `server-only` files, or server-safe helper files. That can trigger the same Next.js bundling bug and pull the dynamically imported Client Components and their dependencies into route bundles.
- If a client registry appears in a public route graph, do not reinterpret that as evidence the registry should be server-safe. Either fix the importing route/module graph while keeping the registry as a Client Component, or explicitly accept the measured bundle trade-off. If a larger fix is justified, split server-only module definitions from admin client registries, or pass client-enabled modules only at the admin entry point.
- Before changing any file with `"use client"` or any dynamic import of a Client Component, stop and explain why the boundary is safe. If the goal is bundle reduction, verify with a production build before and after.
- Use route handlers for API endpoints.
- Do not enumerate private, account, auth, or unlisted page paths in `robots.txt` or `robots.ts`. Robots files are public and are not access control; use auth, redirects, and `noindex` metadata/headers for those pages instead. Keep robots disallow rules to broad technical buckets such as `/admin` and `/api/`, unless the user explicitly asks for a public crawl rule.
- In cached functions or components, place `cacheTag(...)` as high as it can go without changing behavior, near `"use cache"` and `cacheLife(...)`, so cache identity is visible with the other cache setup.
- Keep admin data cacheable, but do not let admin mutations serve stale data while the affected cache entries regenerate. Configure that behavior at the invalidation point with blocking expiration, such as `revalidateTag(tag, { expire: 0 })`, rather than by forcing custom cache profiles on cached loaders or host sites.
- Do not use `<Suspense fallback={null}>`, or component APIs that silently default to a null loading fallback, for page bodies, full-page content, or content sections that affect page height. Null fallbacks collapse the streamed content area and can make the header and footer touch during loading. Use a height-preserving loading component or skeleton instead. A null fallback is only acceptable for small fixed-size slots where the surrounding layout already reserves the space.

## Preserve Existing Capabilities

When implementing a convenience feature or nice-to-have improvement, do not remove, weaken, or bypass existing production behavior to make the new feature easier to add.

If there is a clear implementation path that preserves current behavior, use it. This includes preserving caching, configurability, query behavior, extension points, validation, publishing rules, permissions, and module boundaries.

Treat existing behavior as intentional unless the user explicitly asks to remove it. If a change would trade away an existing capability for a minor simplification, stop and confirm before making that change.

When fixing a bug, do not remove or clean up existing behavior-bearing code unless you have traced the workflow it supports and can prove the replacement preserves that behavior. If a line looks redundant but is outside the exact bug being fixed, leave it in place. Treat existing conditionals, resets, invalidations, redirects, and cache updates as intentional until proven otherwise. A cleanup is not valid if it requires guessing why the old code existed.

## Debugging Churn

When fixing a bug, watch for signs that the current approach is becoming churn: repeated edits to the same area, increasingly broad rewrites, speculative abstractions, layout or state changes that fix one symptom while creating another, or fixes made without a clear explanation of the root cause.

Do not remove, disable, hide, or substantially reduce existing user-facing features, workflows, options, configuration, or data paths in order to make a bug easier to fix. That is usually a regression, not a fix. If preserving the feature appears to make the bug fix much harder, stop and ask for guidance instead of shipping a narrower product behavior.

If that pattern appears, stop and ask for human input before continuing. Summarize what was observed, what changed, what still does not fit, and the simplest suspected cause. Do not keep iterating through complex or compensating changes just to make progress.

For bug fixes, proceed autonomously only when the cause is clear and the fix is narrow. If the cause is not clear, prioritize a short diagnosis and a question over more code changes.

## Situational instructions

- For UI, styling, Tailwind, or shared component work, read `agents/ui.md` before coding.
- When delegating implementation work, instruct the agent to search for existing Kenstack primitives and local usage patterns before building custom UI behavior. Prefer `@kenstack/components/*` and established module patterns over local popover, menu, dialog, tooltip, button, skeleton, list-control, form-control, query-state, or error-state behavior. The agent should explicitly report any custom UI behavior it adds and why no existing primitive fit.
- For database, Drizzle, table schema, Zod, validation, or pipeline schema work, read `agents/data.md` before coding.
- When a Kenstack API, export, helper, type, route, or behavior referenced by the site is missing, renamed, incompatible, or intentionally changed, read and update `agents/migrations.md` as applicable.

## Code style

- Use TypeScript.
- Do not use `any`.
- Use curly braces for all conditionals.
- Prefer existing `lodash-es` utilities for common transformations and collection helpers instead of writing local one-off utility functions.
- Do not export types, helpers, components, or configuration solely to satisfy linting, TypeScript convenience, or anticipated future use. Keep new API surface limited to values that are used now or explicitly requested.
- Do not extract or share small structural types solely because several call sites have similarly named properties. A shared type should mean every consumer supports the full contract. If consumers only share a subset of fields, or some consumers ignore fields the type allows, keep local types or define narrower explicit variants.
- Prefer inferred types unless explicit types improve clarity.
- Treat each new local type alias as suspect until proven useful. Before adding one, confirm it is exported, reused, materially simplifies a noisy function signature, documents a real domain contract, or protects a real generic/external boundary. Otherwise inline the shape and let inference carry it.
- Do not build a top-of-file type block by habit. Keep one-off private object shapes at the function boundary, and avoid naming result, error, row, option, or callback shapes that are used only once.
- Do not move complexity around to make an error disappear. If a change only shifts awkward typing, runtime guards, duplicated data shaping, or config translation to another file, stop and simplify the underlying shape instead.
- If TypeScript pressure leads toward complex conditional types, overloads, casts, duplicated `Resolved*` types, or helper types that mirror inferred values, pause and reassess. Prefer changing the API shape so inference works naturally; ask for guidance before committing to type machinery.
- When a function derives extra properties such as `schema`, `defaultValues`, or normalized config, type the input shape directly and let the return value infer. Do not define a resolved output type only to use `Omit` or a parallel props type for the unresolved input; derive consumer types from the function return when a named type is truly needed.
- For generic helpers, query builders, Drizzle selections, and callback-mapped results, rely on TypeScript inference wherever possible. Avoid adding explicit return generics or result annotations that restate what the compiler can infer from the call site.
- Do not specify component generics at call sites when props such as `schema`, `defaultValues`, `mutationFn`, or callbacks can infer them. Prefer fixing the component/helper typing over repeating type arguments at each use.
- Avoid type casts. A cast is usually a sign that the design or generic boundary has gone off track. If a cast feels necessary, first make several concrete attempts at an inference-friendly shape, such as selecting explicit Drizzle columns, narrowing the input type, using `satisfies`, adding a type guard, or moving validation to a schema boundary. If those attempts fail and a cast is still the only orthodox solution, keep it narrow and flag the tradeoff before proceeding.
- Before adding local type declarations, shims, or small wrappers for an external package, first check whether the package ships its own types or whether the workspace already has appropriate types installed. If types are missing, check npm for the relevant `@types/*` package and install it when available. Use a narrow local boundary only when package/workspace types are not available.
- Do not add alternate return shapes, overloads, or configuration options just to avoid returning a few unused fields or doing a tiny local fallback. Prefer one consistent data shape unless the second shape removes meaningful complexity at several call sites.
- Do not make required values optional in lower-level APIs just to throw runtime errors when they are missing. Let TypeScript describe the real requirement, and validate optional runtime configuration at the boundary that reads or supplies it.
- Do not add runtime fail branches for states that TypeScript should make impossible, such as a required module config missing from a module that defines it. Fix the type shape instead of adding a defensive throw.
- Normalize submitted values at the Zod/input boundary when practical, such as trimming strings in field schemas, instead of adding downstream query or render checks for empty-looking values the schema should already have cleaned up.
- Do not make breaking API or call-site shape changes without checking in first. If a cleanup or type fix would require changing an agreed API, stop and ask before proceeding.
- When renaming or reshaping code that only exists in uncommitted work, update the affected call sites directly. Do not add compatibility aliases, shim exports, or temporary re-export paths for APIs that have not shipped or been committed.
- Keep patches narrow.
- Do not refactor unrelated code.
- Follow existing naming and folder conventions.
- Use the smallest direct fix that solves the actual problem. Do not introduce broad splits, new layers, or larger abstractions when a narrow import, type, or local logic change is sufficient.

## Testing / checks

Before finishing a code change, run the narrowest relevant checks:

- TypeScript check for type changes
- lint for style changes

Before finalizing code changes, read `agents/review.md` and compare the generated code against that checklist. Fix issues that are clearly local and low-risk. If the checklist points to something that would require a broader refactor or a tradeoff, call it out instead of forcing a messy cleanup.

Before finalizing any touched TypeScript file, explicitly audit every new or changed `type` alias, interface, overload, generic, and cast in that file. Remove it unless it has a current, concrete reason under the code style rules above.

After each focused edit, quickly compare the touched hunk against `agents/review.md` before moving on. Catch small local issues while the context is fresh, especially duplicated branches, unnecessary helpers, unclear type extraction, and effects that are not synchronizing with an external system.

For browser/UI verification, check whether a local dev server is already running before asking to start one. Probe the obvious localhost port or inspect listening TCP ports first, since this workspace often already has `next dev` running.

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

Within a module, reserve `fields` for the primary record fields exported from `fields.ts`. Use a specific name for secondary field sets, such as `settingsFields`, so imports stay consistent and the role of each field set is clear.

Field definitions, field helpers, field handlers, field lifecycle code, and field-based record save helpers belong in `src/fields`, not under `src/admin`. Admin may re-export field APIs for ergonomics, but the canonical implementation should stay outside admin when it can be used by non-admin workflows.

Do not create a folder just to hold a single file or an index barrel. Use a direct file, such as `admin/modules.ts` or `queries.ts`, unless the folder already groups multiple files that work together or the current change is adding those sibling files as part of the same feature. Do not add an index barrel only to preserve an import path.

Avoid spreading a simple change across multiple locations when it can be expressed clearly in one local place. A small amount of inline repetition is acceptable when it keeps the code easier to read and reason about.

Do not introduce pass-through configuration constants that are only handed to a typed API call. Inline those objects in the typed call so contextual typing, excess property checks, and editor hints work at the point where the shape is validated. This applies broadly to table columns, fields, schemas, module config, options objects, and similar typed configuration. Extract only when the value is reused independently or the extraction creates a real boundary.

Prefer named exports for reusable configuration pieces that are assembled into larger config objects, especially when the export name can match the config role at the call site. Use default exports only when the file has one primary value and callers do not benefit from a role-specific imported name.

Inline simple expressions when they are used once, especially in JSX props. Do not introduce a local variable only to rename a direct function call, property access, or simple boolean expression. Use a local variable when it avoids repeated work, clarifies a non-obvious expression, prevents a long line from becoming hard to read, or gives a meaningful name to a concept reused in nearby logic.

Use the clearest string construction for the expression. Prefer plain concatenation when a template literal would mostly wrap a conditional or short fragments in punctuation; use template literals when interpolation makes the result easier to read.

Prefer destructuring callback parameters or local objects when it removes one-off property aliases and lets JSX return directly, especially in `map` callbacks. Keep an explicit callback body when it needs meaningful setup, branching, or reused derived values.

Inline small object parameter types for private functions when the type is used once and the fields are easier to understand at the function boundary. Extract a named type when it is exported, reused, large enough to distract from the function body, or represents a real domain concept.

Prefer complete initial declarations over immediate follow-up mutation. If an array or object always includes a value, include it in the literal instead of declaring first and then calling `push`, assigning a property, or spreading into it on the next line.

Prefer object spread over `Object.assign` for local object assembly. Use `Object.assign` only when mutating an existing object is the point, such as integrating with an API that requires mutation.

Avoid intermediate arrays or objects that only name one step in a fluent transformation before being immediately mapped, filtered, spread, or returned. Keep the chain together unless the intermediate value is reused or the name explains a meaningful domain concept.

Combine adjacent guard conditions when the inner branch only returns, throws, continues, or breaks. Avoid nesting `if` statements that can be expressed as one readable condition, such as `if (isReady && !value) return ...`, unless the nested structure separates genuinely different decisions or improves readability.

When branching between several peer cases outside JSX, such as named actions, modes, kinds, or statuses, prefer a `switch` over a run of repeated `if` branches. Reserve early `if` returns for guards, exceptional cases, or one-off branches that clearly do not belong to the same dispatch.

Prefer rendering markup directly in JSX over breaking it into separate variables. If direct JSX would require a complex nested ternary, use an inline function pattern with explicit `return` branches so the markup stays local but the control flow remains readable. Extract markup only when it materially improves readability, removes meaningful duplication, or creates a real reusable component.

Avoid `useEffect` unless synchronizing with an external system or browser API that cannot be handled during render, event handling, or by the data library itself. Do not add effects only to mirror derived state, react to `useQuery` data/errors, log query results, or trigger follow-up work that belongs in a query function, mutation callback, route action, or explicit user event.

When multiple components or files are designed to work together as one unit, put them in a dedicated folder and avoid repeating the folder concept in each filename when the shorter names remain clear. For example, prefer `components/AdminShortcutLink/index.tsx` and `components/AdminShortcutLink/Client.tsx` over sibling files named `AdminShortcutLink.tsx` and `AdminShortcutLinkClient.tsx`.

When adding configurable options, choose the shallowest shape that is likely to remain clear. Do not add nested option objects only because future settings might exist. If names are already specific, such as `uploadMaxImageSize`, prefer flat options over `{ upload: { maxImageSize } }` unless there is already an established nested configuration pattern.

Avoid narrow styling mode props such as `framed`, `compact`, or `plain` when they only toggle a small class set. Prefer `className` with `twMerge`, explicit composition, or a local wrapper so callers control presentation without adding component-specific styling vocabulary.

Before adding a helper, ask whether it meaningfully hides complexity or only forces the reader to jump elsewhere. Avoid pass-through helpers, type guards, mappers, normalizers, and adapters that only rename a direct lookup, discriminator check, API call, or local data reshaping. Prefer direct readable code unless the helper provides meaningful reuse, validation, normalization, caching, logging, or a real boundary.

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

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
- Before adding `server-only`, a server-only import, or a server builder to an existing `index.ts` or barrel, search every importer of that entry point. If any importer belongs to a Client Component graph, keep the barrel client-safe or update those consumers to explicit client-safe subpaths in the same change. A barrel's runtime boundary is determined by its consumers, not only by its directives.
- Use route handlers for API endpoints.
- Do not enumerate private, account, auth, or unlisted page paths in `robots.txt` or `robots.ts`. Robots files are public and are not access control; use auth, redirects, and `noindex` metadata/headers for those pages instead. Keep robots disallow rules to broad technical buckets such as `/admin` and `/api/`, unless the user explicitly asks for a public crawl rule.
- In cached functions or components, place `cacheTag(...)` as high as it can go without changing behavior, near `"use cache"` and `cacheLife(...)`, so cache identity is visible with the other cache setup.
- Keep admin data cacheable, but do not let admin mutations serve stale data while the affected cache entries regenerate. Configure that behavior at the invalidation point with blocking expiration, such as `revalidateTag(tag, { expire: 0 })`, rather than by forcing custom cache profiles on cached loaders or host sites.
- Do not use `<Suspense fallback={null}>`, or component APIs that silently default to a null loading fallback, when the fallback can be perceptibly rendered and collapsing the suspended content would create a visible layout problem, especially by pulling persistent headers and footers together. Use a height-preserving loading component or skeleton for page bodies or content sections with meaningful latency. A null fallback is acceptable for small fixed-size slots whose surrounding layout already reserves the space, work that resolves before the fallback is visibly displayed, or standalone layouts without surrounding chrome that would collapse into the missing content. Judge the actual surrounding layout and expected latency; do not add a large duplicate skeleton solely because a Suspense boundary covers a large subtree.

## Preserve Existing Capabilities

When implementing a convenience feature or nice-to-have improvement, do not remove, weaken, or bypass existing production behavior to make the new feature easier to add.

Kenstack is a shared submodule consumed by multiple host sites. Usage visible in one host repository is not proof that a Kenstack feature, export, helper, or extension point is unused. Do not remove, rename, narrow, or inline shared capabilities based only on a single site's call sites. Treat the public surface as potentially used by other consumers and require explicit cross-consumer evidence, deprecation and migration handling, or direct authorization before removing it.

If there is a clear implementation path that preserves current behavior, use it. This includes preserving caching, configurability, query behavior, extension points, validation, publishing rules, permissions, and module boundaries.

Treat existing behavior as intentional unless the user explicitly asks to remove it. If a change would trade away an existing capability for a minor simplification, stop and confirm before making that change.

When fixing a bug, do not remove or clean up existing behavior-bearing code unless you have traced the workflow it supports and can prove the replacement preserves that behavior. If a line looks redundant but is outside the exact bug being fixed, leave it in place. Treat existing conditionals, resets, invalidations, redirects, and cache updates as intentional until proven otherwise. A cleanup is not valid if it requires guessing why the old code existed.

## Change Threshold

Do not make a code change unless it produces a concrete current improvement: fixing correctness or user behavior, preserving meaningfully stronger types, removing real duplication or indirection, or completing a necessary coherent migration.

Equivalence is a reason not to edit. Do not change code merely because another form is equally valid, more explicit, newer-looking, or stylistically preferable. If runtime behavior, inferred types, readability, and maintenance cost are materially unchanged, leave the file untouched.

Apply this threshold before editing, not as a final diff cleanup. Be able to state the specific before-and-after improvement in one sentence at the affected call site or ownership boundary. If the benefit is theoretical, cannot be verified, or only moves complexity, do not start the change. If investigation shows that a proposed edit makes no meaningful difference, stop and preserve the existing code.

Mechanical migrations clear the threshold when a real contract or representation has changed and the same required transformation must be applied consistently. Do not mix those migrations with optional renames, inference-neutral type edits, or adjacent cleanup.

Configured Prettier output is an explicit exception to this threshold. Treat formatting-only changes produced by Prettier in in-scope or touched files as deterministic mechanical output: stage them without asking for human review, and do not report them as cleanup findings. Do not expand formatting to unrelated files unless the task or repository workflow requires it.

## Directness Gate

Apply this gate while writing TypeScript and again before finalizing it. Default to direct code. Every added or changed helper, wrapper, factory, adapter, alias, intermediate value, type, export, barrel, or forwarding file must have a concrete current purpose.

One current caller or consumer is presumptive evidence that a layer should be inlined. Keep it only when it provides meaningful repeated behavior, validation, normalization, parsing, nontrivial domain logic, stable callback identity, or a deliberate runtime or public boundary. A descriptive name, conventional organization, a shorter call site, possible future reuse, or anticipated compatibility is not sufficient.

Mechanically audit changed TypeScript for:

- declarations referenced only once;
- pass-through functions, callback adapters, and factories without meaningful configuration;
- values assigned and then immediately renamed instead of being bound to the final name;
- configuration extracted only to be handed to one typed API call;
- forwarding modules, aliased re-exports, compatibility shims, and exported values without external consumers.

Remove each candidate or be able to state its concrete current reason for remaining. Bind or destructure to final names at the producing boundary, keep typed configuration at the typed call site, and import canonical exports directly. Do not inline when doing so would duplicate meaningful work, obscure a behavioral invariant, hide a complex workflow, or erase a real ownership or runtime boundary.

## Defense in Depth

Add a defensive check when the guarded state has a credible path through supported use, stale or concurrent state, external input, or a boundary the application does not control, and when reaching it would have a meaningful consequence. Also add a check when the consequence is sufficiently serious or difficult to reverse that a low likelihood does not make the risk acceptable.

Before adding a guard, identify the path that can reach it, the consequence it prevents, the guarantees already enforced elsewhere, and how a user or operator can recover. If no credible path or meaningful consequence can be stated, do not add runtime checks, blocking errors, or recovery UI for the hypothetical state. Record or defer the concern when appropriate instead of making the common workflow carry its cost.

Prefer non-blocking visibility when an unlikely state is recoverable and the application can continue safely. Use blocking validation only when continuing would create a materially worse state. A blocking message must identify the affected value or operation closely enough that the user can resolve it; do not add generic defensive errors that merely report an internal invariant.

Do not duplicate an invariant at every layer by default. Add another enforcement point only when it protects a distinct boundary, improves the failure mode, or contains a consequence that the existing enforcement cannot reliably prevent.

## Debugging Churn

When fixing a bug, watch for signs that the current approach is becoming churn: repeated edits to the same area, increasingly broad rewrites, speculative abstractions, layout or state changes that fix one symptom while creating another, or fixes made without a clear explanation of the root cause.

Do not remove, disable, hide, or substantially reduce existing user-facing features, workflows, options, configuration, or data paths in order to make a bug easier to fix. That is usually a regression, not a fix. If preserving the feature appears to make the bug fix much harder, stop and ask for guidance instead of shipping a narrower product behavior.

If that pattern appears, stop and ask for human input before continuing. Summarize what was observed, what changed, what still does not fit, and the simplest suspected cause. Do not keep iterating through complex or compensating changes just to make progress.

For bug fixes, proceed autonomously only when the cause is clear and the fix is narrow. If the cause is not clear, prioritize a short diagnosis and a question over more code changes.

## Situational instructions

- For UI, styling, Tailwind, or shared component work, read `agents/ui.md` before coding.
- For errors, warnings, hydration mismatches, broken UI states, failing tests, runtime exceptions, console errors, or regressions, read `agents/debug.md` before coding.
- For Kenstack admin module definitions, edit forms, list views, field list/filter/sort behavior, or admin layout work, read `agents/admin.md` before coding.
- When delegating implementation work, instruct the agent to search for existing Kenstack primitives and local usage patterns before building custom UI behavior. Prefer `@kenstack/components/*` and established module patterns over local popover, menu, dialog, tooltip, button, skeleton, list-control, form-control, query-state, or error-state behavior. The agent should explicitly report any custom UI behavior it adds and why no existing primitive fit.
- For TypeScript type aliases, interfaces, overloads, generic arguments, casts, explicit return annotations, or type-heavy helper APIs, read `agents/typescript.md` before coding.
- For database, Drizzle, table schema, Zod, validation, or pipeline schema work, read `agents/data.md` before coding.
- When a Kenstack API, export, helper, type, route, or behavior referenced by the site is missing, renamed, incompatible, or intentionally changed, read and update `agents/migrations.md` as applicable.

## Code style

- Use TypeScript.
- Do not use `any`.
- Use curly braces for all conditionals.
- Prefer existing `lodash-es` utilities for common transformations and collection helpers instead of writing local one-off utility functions.
- Follow `agents/typescript.md` for type aliases, interfaces, overloads, generic arguments, casts, explicit return annotations, type-heavy helper APIs, and TypeScript inference decisions.
- Name shared and exported types for the concept a caller passes, receives, or implements, not for an internal construction or merge step. Do not rename a type solely because its implementation changed; follow the call-site and rename-safety checks in `agents/typescript.md`.
- Do not move complexity around to make an error disappear. If a change only shifts awkward typing, runtime guards, duplicated data shaping, or config translation to another file, stop and simplify the underlying shape instead.
- Do not add alternate return shapes, overloads, or configuration options just to avoid returning a few unused fields or doing a tiny local fallback. Prefer one consistent data shape unless the second shape removes meaningful complexity at several call sites.
- Before proposing or adding a callback, hook, lifecycle result, configuration option, or parallel code path, trace the existing extension points for that behavior end to end. Prefer configuring or narrowly extending the existing path. Introduce another path only when the current mechanism cannot express the required behavior, and identify that limitation explicitly.
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

Before finalizing any touched TypeScript file, read `agents/typescript.md` and explicitly audit every new or changed type alias, interface, overload, generic argument, explicit return annotation, and cast in that file. Remove it unless it has a current, concrete reason under those rules.

After each focused edit, quickly compare the touched hunk against `agents/review.md` before moving on. Catch small local issues while the context is fresh, especially duplicated branches, unnecessary helpers, unclear type extraction, and effects that are not synchronizing with an external system.

For browser/UI verification, check whether a local dev server is already running before asking to start one. Probe the obvious localhost port or inspect listening TCP ports first, since this workspace often already has `next dev` running.

## Safety rules

- Do not modify `.env*` files.
- Treat `.env*` files, cloud credential files, private keys, connection strings, and values whose names contain `SECRET`, `TOKEN`, `PASSWORD`, or `KEY` as secret-bearing. Never print their contents in tool output, command arguments, logs, commentary, or final responses.
- Do not include secret-bearing files in broad `rg`, `grep`, `find`, `cat`, `sed`, or configuration-dump commands. Inspect configuration with a narrowly scoped script that reports only variable names, presence, or redacted metadata such as a hostname or bucket name.
- Commands that need credentials may load them silently from the existing environment or SDK credential chain. Never interpolate a credential value into a shell command, URL, generated file, or tool-call argument.
- Before running a command that could echo environment variables, request headers, configuration objects, or error details from an authenticated service, constrain or redact its output at the source.
- If a credential is exposed in any tool output, stop using it, tell the user which credential category was exposed without repeating its value, and recommend revocation or rotation. Do not continue an external write with the exposed credential unless the user explicitly directs you to.
- Do not change auth, billing, or migration logic unless asked.
- When moving or deleting tracked files, use git-aware commands such as `git mv` or `git rm` so renames and deletions merge cleanly. Use plain filesystem commands only for untracked files.
- Do not add dependencies without asking.
- Do not reformat unrelated files.

## Local code shape

Keep top-level files in broad feature folders, such as `src/admin`, reserved for primary public APIs and major entry points that should be easy to reference. Put secondary implementation details, support constants, and internal UI adapters in a subfolder such as `lib`, `components`, `api`, or another existing domain folder.

Folders named `modules` are for actual module definitions and module-owned files. Do not put helper code that builds, loads, renders, or works with modules in `modules`; place that infrastructure under the feature it belongs to, such as `admin/moduleSettings`.

Within a module, reserve `fields` for the primary record fields exported from `fields.ts`. Use a specific name for secondary field sets, such as `settingsFields`, so imports stay consistent and the role of each field set is clear.

Field definitions, field helpers, field handlers, field lifecycle code, and field-based record save helpers belong in `src/fields`, not under `src/admin`. Admin may re-export field APIs for ergonomics, but the canonical implementation should stay outside admin when it can be used by non-admin workflows.

Do not create a folder just to hold a single file or an index barrel. Use a direct file, such as `admin/modules.ts` or `queries.ts`, unless the folder already groups multiple files that work together or the current change is adding those sibling files as part of the same feature. Do not add an index barrel only to preserve an import path.

Avoid spreading a simple change across multiple locations when it can be expressed clearly in one local place. A small amount of inline repetition is acceptable when it keeps the code easier to read and reason about.

Prefer named exports for reusable configuration pieces that are assembled into larger config objects, especially when the export name can match the config role at the call site. Use default exports only when the file has one primary value and callers do not benefit from a role-specific imported name.

Use the clearest string construction for the expression. Prefer plain concatenation when a template literal would mostly wrap a conditional or short fragments in punctuation; use template literals when interpolation makes the result easier to read.

Inline small object parameter types for private functions when the type is used once and the fields are easier to understand at the function boundary. Extract a named type when it is exported, reused, large enough to distract from the function body, or represents a real domain concept.

Prefer complete initial declarations over immediate follow-up mutation. If an array or object always includes a value, include it in the literal instead of declaring first and then calling `push`, assigning a property, or spreading into it on the next line.

Prefer object spread over `Object.assign` for local object assembly. Use `Object.assign` only when mutating an existing object is the point, such as integrating with an API that requires mutation.

Avoid intermediate arrays or objects that only name one step in a fluent transformation before being immediately mapped, filtered, spread, or returned. Keep the chain together unless the intermediate value is reused or the name explains a meaningful domain concept.

Combine adjacent guard conditions when the inner branch only returns, throws, continues, or breaks. Avoid nesting `if` statements that can be expressed as one readable condition, such as `if (isReady && !value) return ...`, unless the nested structure separates genuinely different decisions or improves readability.

When branching between several peer cases outside JSX, such as named actions, modes, kinds, or statuses, prefer a `switch` over a run of repeated `if` branches. Reserve early `if` returns for guards, exceptional cases, or one-off branches that clearly do not belong to the same dispatch.

Prefer rendering markup directly in JSX over breaking it into separate variables. If direct JSX would require a complex nested ternary, use an inline function pattern with explicit `return` branches so the markup stays local but the control flow remains readable. Extract markup only when it materially improves readability, removes meaningful duplication, or creates a real reusable component.

Avoid `useEffect` unless synchronizing with an external system or browser API that cannot be handled during render, event handling, or by the data library itself. Do not add effects only to mirror derived state, react to `useQuery` data/errors, log query results, or trigger follow-up work that belongs in a query function, mutation callback, route action, or explicit user event.

When browser-only state cannot be available during server rendering, initialize with a deterministic server-safe value and restore the browser value after hydration. A narrow, explained `react-hooks/set-state-in-effect` suppression is acceptable for that synchronization; do not add indirection solely to satisfy the lint rule. Reserve `useSyncExternalStore` for values owned outside React that provide a meaningful subscription and snapshot contract. Do not use a no-op subscription merely to detect mounting, distinguish server from client, or avoid an effect suppression.

When multiple components or files are designed to work together as one unit, put them in a dedicated folder and avoid repeating the folder concept in each filename when the shorter names remain clear. For example, prefer `components/AdminShortcutLink/index.tsx` and `components/AdminShortcutLink/Client.tsx` over sibling files named `AdminShortcutLink.tsx` and `AdminShortcutLinkClient.tsx`.

When adding configurable options, choose the shallowest shape that is likely to remain clear. Do not add nested option objects only because future settings might exist. If names are already specific, such as `uploadMaxImageSize`, prefer flat options over `{ upload: { maxImageSize } }` unless there is already an established nested configuration pattern.

Avoid narrow styling mode props such as `framed`, `compact`, or `plain` when they only toggle a small class set. Prefer `className` with `twMerge`, explicit composition, or a local wrapper so callers control presentation without adding component-specific styling vocabulary.

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

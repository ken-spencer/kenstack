<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## Code style

- Use TypeScript.
- Do not use `any`.
- Use curly braces for all conditionals.
- Prefer existing `lodash-es` utilities for common transformations and collection helpers instead of writing local one-off utility functions.
- Do not export types, helpers, components, or configuration solely to satisfy linting, TypeScript convenience, or anticipated future use. Keep new API surface limited to values that are used now or explicitly requested.
- Prefer inferred types unless explicit types improve clarity.
- For generic helpers, query builders, Drizzle selections, and callback-mapped results, rely on TypeScript inference wherever possible. Avoid adding explicit return generics or result annotations that restate what the compiler can infer from the call site.
- Avoid type casts. A cast is usually a sign that the design or generic boundary has gone off track. If a cast feels necessary, first look for an inference-friendly shape; if a cast still appears to be the only orthodox solution, keep it narrow and be ready to flag the tradeoff before proceeding.
- Do not add pass-through helpers that only rename or lightly wrap an existing API without reducing real complexity. Prefer calling the underlying API directly, especially for simple local defaults.
- Do not add alternate return shapes, overloads, or configuration options just to avoid returning a few unused fields or doing a tiny local fallback. Prefer one consistent data shape unless the second shape removes meaningful complexity at several call sites.
- Prefer rendering markup directly in JSX over breaking it into separate variables. If direct JSX would require a complex nested ternary, use an inline function pattern with explicit `return` branches so the markup stays local but the control flow remains readable. Extract markup only when it materially improves readability, removes meaningful duplication, or creates a real reusable component.
- Do not make breaking API or call-site shape changes without checking in first. If a cleanup or type fix would require changing an agreed API, stop and ask before proceeding.
- Keep patches narrow.
- Do not refactor unrelated code.
- Follow existing naming and folder conventions.
- Use the smallest direct fix that solves the actual problem. Do not introduce broad splits, new layers, or larger abstractions when a narrow import, type, or local logic change is sufficient.

## Next.js conventions

- Use the App Router.
- Prefer Server Components by default.
- Add `"use client"` only when needed.
- Do not pass non-serializable values from server to client components.
- Keep data loading on the server unless the UI requires client-side updates.
- Use route handlers for API endpoints.

## Styling

- Use Tailwind utilities.
- Prefer existing shared components before adding new ones.
- Keep class names compatible with Prettier/Tailwind sorting.

## Database

- Use Drizzle ORM.
- Do not edit generated migrations casually.
- Do not change schema names or column names without checking existing migrations.
- Prefer explicit nullability and defaults.

## Validation

- Use Zod v4.
- Prefer Zod's direct string message syntax when it is supported, for example `.refine(check, "Message")` and `.min(1, "Message")`, instead of wrapping simple messages in `{ message: "Message" }`.
- Keep client and server schemas aligned.
- Use server-specific coercion only where needed.
- Prefer passing schemas to `pipelineStage({ schema })` so parsing and errors are handled by the pipeline. Manual `safeParse` / `parse` inside a stage is an escape hatch for cases the pipeline cannot express.
- Do not create a second enhanced schema when the original can be defined correctly at the point of use. Move the schema closer to the needed runtime context instead of layering `baseSchema` plus `schemaWithConfig`, unless the base schema is reused independently.

## Testing / checks

Before finishing a code change, run the narrowest relevant checks:

- TypeScript check for type changes
- lint for style changes
- build for Next.js/runtime-sensitive changes

## Kenstack migrations

When a Kenstack API, export, helper, type, route, or behavior referenced by the site is missing, renamed, or incompatible, read `kenstack/migrations.md` before inventing a replacement. Use it to map old APIs to current APIs and follow any listed migration steps.

When making a breaking Kenstack API change, update `kenstack/migrations.md` with the old API, the new API, and concise migration steps for downstream sites and agents.

## Safety rules

- Do not modify `.env*` files.
- Do not change auth, billing, or migration logic unless asked.
- When moving or deleting tracked files, use git-aware commands such as `git mv` or `git rm` so renames and deletions merge cleanly. Use plain filesystem commands only for untracked files.
- Do not add dependencies without asking.
- Do not reformat unrelated files.
- Do not modify `components/ui` because shadcn can overwrite those files.
- Avoid making custom components if shadcn has one that will do the job.

## Simplicity and locality

Prefer keeping small configuration defaults and one-off logic close to the place where they are used. Do not introduce extra constants, helper functions, nested objects, or cross-file modules unless they reduce real duplication, clarify a repeated concept, or create a boundary that is already meaningful in the codebase.

Avoid spreading a simple change across multiple locations when it can be expressed clearly in one local place. A small amount of inline repetition is acceptable when it keeps the code easier to read and reason about.

When adding configurable options, choose the shallowest shape that is likely to remain clear. Do not add nested option objects only because future settings might exist. If names are already specific, such as `uploadMaxImageSize`, prefer flat options over `{ upload: { maxImageSize } }` unless there is already an established nested configuration pattern.

Before adding a helper, ask whether the helper meaningfully hides complexity or whether it only forces the reader to jump elsewhere. Prefer direct, readable code over abstraction for abstraction’s sake.

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

Avoid adding helper constants, nested option objects, or repeated `options.foo ?? defaultValue` assignments unless the configuration is genuinely complex or reused in multiple places.

Prefer shallow config and final spreads for simple settings. Use `merge` only when nested configuration is intentional and the merge behavior is clearly needed.

## Avoid parallel versions

Do not create a second “enhanced” version of a value, schema, config, or helper when the original can be defined correctly at the point of use.

Prefer moving the original definition closer to the context it needs over layering another object on top of it. For example, if a Zod schema needs runtime config, define that schema inside the function or stage where the config is available instead of creating `baseSchema` plus `schemaWithConfig`.

Use layered definitions only when the base version is reused independently.

Prefer handling schemas automatically in the pipeline stages rather than running the parse logic manually. This is only to be used as an escape hatch when the pipelineStage impleentation cannot give the desired result.

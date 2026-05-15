<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## Code style

- Use TypeScript.
- Do not use `any`.
- Use curly braces for all conditionals.
- Prefer inferred types unless explicit types improve clarity.
- Keep patches narrow.
- Do not refactor unrelated code.
- Follow existing naming and folder conventions.

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
- Keep client and server schemas aligned.
- Use server-specific coercion only where needed.
- Prefer passing schemas to `pipelineStage({ schema })` so parsing and errors are handled by the pipeline. Manual `safeParse` / `parse` inside a stage is an escape hatch for cases the pipeline cannot express.
- Do not create a second enhanced schema when the original can be defined correctly at the point of use. Move the schema closer to the needed runtime context instead of layering `baseSchema` plus `schemaWithConfig`, unless the base schema is reused independently.

## Testing / checks

Before finishing a code change, run the narrowest relevant checks:

- TypeScript check for type changes
- lint for style changes
- build for Next.js/runtime-sensitive changes

## Safety rules

- Do not modify `.env*` files.
- Do not change auth, billing, or migration logic unless asked.
- Do not add dependencies without asking.
- Do not reformat unrelated files.
- Do not modify `components/ui` because shadcn can overwrite those files.
- Avoid making custom components if shadcn has one that will do the job.

## Simplicity and locality

Prefer keeping small configuration defaults and one-off logic close to the place where they are used. Do not introduce extra constants, helper functions, nested objects, or cross-file modules unless they reduce real duplication, clarify a repeated concept, or create a boundary that is already meaningful in the codebase.

Avoid spreading a simple change across multiple locations when it can be expressed clearly in one local place. A small amount of inline repetition is acceptable when it keeps the code easier to read and reason about.

When adding configurable options, choose the shallowest shape that is likely to remain clear. Do not add nested option objects only because future settings might exist. If names are already specific, such as `uploadMaxImageSize`, prefer flat options over `{ upload: { maxImageSize } }` unless there is already an established nested configuration pattern.

Before adding a helper, ask whether the helper meaningfully hides complexity or whether it only forces the reader to jump elsewhere. Prefer direct, readable code over abstraction for abstraction’s sake.

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

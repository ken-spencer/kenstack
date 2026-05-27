# Review Checklist

Use this checklist before finalizing code changes. It is meant to catch project preferences that are easy to miss during implementation.

## Type Shape

- Remove casts that can be replaced cleanly with inference, a type guard, Zod parsing, or `satisfies`.
- Keep necessary casts narrow and at real generic, Drizzle, React polymorphic, or untyped external boundaries.
- Prefer inferred return types when the implementation already expresses the type clearly.
- Prefer `satisfies` for validating returned object shapes without forcing a function return annotation.
- Do not specify component or form generics at call sites when props and callbacks can infer them.
- Do not add runtime throws, guards, or branches only to satisfy a TypeScript tuple, generic, or narrowing shape. If the runtime can handle the value gracefully, fix the type boundary or move validation to the caller that actually requires the stricter invariant.

## Local Code Shape

- Remove single-use variables that only rename a direct call, property access, or simple expression.
- Move immediate follow-up mutations into the initial array or object declaration when the value is unconditional.
- Remove intermediate arrays or objects that only name one step in a fluent transformation before being immediately consumed.
- Check repeated loops over the same collection. Combine them when one pass can gather the needed values without making the code harder to read.
- Remove pass-through helpers, wrappers, constants, and barrels unless they reduce real repeated complexity or expose a requested public API.
- Before keeping local string/date/collection formatting logic, check whether an existing installed utility already owns that behavior, such as `lodash-es`, `pluralize`, `date-fns`, `chrono-node`, or `validator`.
- Check one-line `is*`, `get*`, and `has*` helpers. Remove them when they only hide a direct discriminator check, property lookup, or local ternary and do not provide meaningful reuse, validation, or type narrowing across an unsafe boundary.
- When touching a file, review nearby private helpers that predate the current change. Inline helpers that only return an optional property, defaulted object, mapped key list, or one local branch. Keep helpers that provide real generic narrowing, validation of external/unknown data, shared behavior, or a meaningful domain boundary.
- Review each newly added function, type, helper, and local alias one by one. Keep it only if it meaningfully improves inference, readability, reuse, validation, or a real boundary; remove it if it merely renames a direct expression, works around a local type issue, or anticipates future use.
- Flatten nested guard `if` statements when the inner branch only returns, throws, continues, or breaks and the combined condition remains readable.
- Inline typed configuration objects at the typed call site so contextual typing and excess property checks work there.
- Avoid creating alternate return shapes, enhanced schemas, or parallel config objects when the original can be defined correctly at the point of use.
- Do not split simple local logic into builder, mapper, normalizer, converter, or adapter functions unless the split removes meaningful repeated complexity.

## Field And Form Behavior

- Keep field definitions, field helpers, field handlers, field lifecycle code, and field-based record helpers in `src/fields` when they are reusable outside admin.
- Do not hand-plumb save, load, delete, display, list, filter, or sort behavior in actions when the field lifecycle should own it.
- Ensure client field definitions stay client-safe; server-only handlers and transforms should be applied through server field helpers.
- For forms, rely on schema/default/mutation inference instead of repeating generic arguments at usage sites.

## Files And Boundaries

- Keep top-level feature folders reserved for primary APIs and major entry points.
- Put support code in existing secondary folders such as `lib`, `components`, `api`, or `fields`.
- Do not put module infrastructure in `modules`; that folder is for actual modules and module-owned files.
- Do not add compatibility shims, pass-through re-exports, or barrels unless explicitly requested or already established as a public API.

## Behavior

- Preserve existing capabilities such as caching, validation, permissions, publishing rules, extension points, query behavior, and revalidation.
- Keep cache tags near `"use cache"` and `cacheLife(...)` as high in the function as behavior allows.
- Do not remove configurability or behavior to make a cleanup easier without confirming first.
- Check whether client and server parse the same payload, query state, filters, or form values with separate schemas. Share the common schema or schema helper where possible so validation and coercion do not drift.
- Check hand-written validators and `value is ...` guards against existing Zod schemas. Prefer the canonical schema for submitted data unless the guard is only a lightweight UI/rendering branch.
- Check field lifecycle behavior for duplicate schema parsing. If the action pipeline already parsed the payload, do not parse again inside the handler; use the parsed value shape at the lifecycle boundary.
- Check for placeholders, dummy values, temporary review states, test-only copy, fake data, and scaffold comments. Remove them before finalizing unless the user explicitly asked to keep them.

## Final Checks

- Run the narrowest relevant checks: TypeScript for type changes, lint for style changes, and build only for runtime-sensitive Next.js changes unless instructed otherwise.
- Review the diff for unrelated formatting, file moves, or broad refactors.
- If a checklist item would make the code more complex for the same result, leave the code alone and mention the tradeoff.

# Review Checklist

Use this checklist before finalizing code changes. It is meant to catch project preferences that are easy to miss during implementation.

Our primary review goal is to keep the code simple, direct, and easy to follow.

Evaluate all changes through that lens. Prefer clear, explicit code over unnecessary abstraction. Avoid indirection, cleverness, duplication, and redundant structure unless they provide a clear practical benefit.

When reviewing, look for opportunities to reduce complexity, improve readability, and make the intent of the code obvious to the next developer.

## Type Shape

- List every new or changed local `type` alias, interface, overload, generic, and cast in each touched TypeScript file. Keep each one only if it is exported, reused, materially simplifies a noisy function signature, documents a real domain contract, or protects a real generic/external boundary.
- Inline one-use private shapes instead of creating names such as `SavedRow`, `Result`, `Error`, `Options`, `Query`, or `Callback` when the name only repeats the surrounding function or file context.
- Do not leave a top-of-file type block just because a file has several typed values. Prefer inference and inline function-boundary object types unless a named type earns its place.
- Remove casts that can be replaced cleanly with inference, a type guard, Zod parsing, or `satisfies`.
- Keep necessary casts narrow and at real generic, Drizzle, React polymorphic, or untyped external boundaries.
- Prefer inferred return types when the implementation already expresses the type clearly.
- Prefer `satisfies` for validating returned object shapes without forcing a function return annotation.
- Check `Resolved*`, `Defined*`, and similarly named output types that mirror a builder or resolver. Prefer deriving broad consumer types from `ReturnType<typeof builder>` or letting the call site infer the specific shape; keep a named resolved type only when it is reused independently or documents a real public contract that cannot be inferred cleanly.
- Check newly shared types. If consumers only overlap partially, or allowed properties are ignored by some consumers, prefer local shapes or narrower variants over one broad shared type.
- Treat explicit generic arguments on parameterless hooks or context helpers as suspicious. Temporarily remove them during review; keep them only when the resulting inferred type is wrong at a real boundary, not merely broader.
- Do not specify component or form generics at call sites when props, callbacks, schema, defaults, mutation variables, or context already provide a useful inferred type.
- Do not add runtime throws, guards, or branches only to satisfy a TypeScript tuple, generic, or narrowing shape. If the runtime can handle the value gracefully, fix the type boundary or move validation to the caller that actually requires the stricter invariant.

## Local Code Shape

- Do an alias pass over new and changed locals. A local name must earn its place by avoiding meaningful repetition, clarifying a real domain concept, or containing complexity that would be harder to read inline; otherwise inline it.
- Make the alias pass mechanical, not vibes-based: after edits, search or scan touched TypeScript files for local `const` declarations referenced only once. Inline each one unless the remaining name has a concrete current reason, and be ready to name that reason.
- Important exception: do not inline auth/current-user lookups into query predicates or other behavior-defining expressions. Resolve values such as `const user = await deps.auth.requireUser()` and `const userId = user.id` near the top of the nearest function boundary so user-scoped behavior is obvious during review.
- Treat single-use variables as suspect by default, especially when the value is immediately handed to JSX or another nearby call.
- Inline single-use style objects. When the same styling intent is reused, make a small component at the right owner instead of keeping a shared `*Style` object that is only passed to JSX.
- Remove aliases that hide the meaningful condition, such as `pendingValue = isPending ? value : undefined`. Keep the condition visible where it drives the branch unless a name captures a real domain concept reused nearby.
- After deriving a value from a condition, avoid re-checking the same condition or source fields in adjacent code. Reuse the derived value or split the logic into explicit branches when that reads clearer.
- When both branches of a conditional apply the same wrapper, coercion, fallback, or formatting helper, move that shared operation outside the conditional so the branch only chooses the differing value.
- Avoid nested ternaries for multi-way choices, especially discriminator-to-label/icon/component mappings. Prefer a `switch` or explicit branches so each case is named plainly.
- In JSX components, check one-use event handlers and local aliases. Inline them when the event site is clearer; keep named handlers for reuse, complex branching, domain workflows, or stable callback identity.
- Do not pass `initial*` props that duplicate data already owned by the same query, context, or provider. Seed the shared state at the boundary and read it from one source.
- Remove generic temporary variables that merge distinct cases only to feed a nearby branch or call. Prefer explicit branches when the cases have different domain meanings, such as separate list-record and single-record cache targets.
- Prefer direct guard returns for terminal UI states such as errors, empty states, redirects, and permission denials. Do not gather a temporary message or status value only to render that terminal branch a few lines later.
- Before keeping local JSX helpers or hand-rolled styled markup for common UI states such as errors, loading, empty, success, or informational messages, check for an existing shared primitive or local component owner. Use that existing component, or create one at the right owner if the pattern is truly missing, instead of copying class strings into each feature.
- Check state-specific JSX helpers and component branches for duplicated section, card, heading, or layout shells. When one component owns all states, render the shell once and put loading/error/empty/content branching inside it instead of swapping whole outer components. Use a shared shell helper only when that shell is reused across separate components or distant call sites.
- For Suspense around auth/data branches, keep the boundary at the smallest server-rendered branch that actually awaits the data. Do not wrap a whole navigation, page section, card, or layout shell when only one nested item depends on async/auth state. Render the stable shell once, and suspend only the auth/data-dependent child slot. The authenticated/suspended component should render only the private or async-dependent fragment, not the whole parent/client component with public props passed through. Public links, shells, headings, sections, and other always-visible UI should be rendered outside the auth/data branch even when nearby client behavior needs its own wrapper. If that slot lives inside a client component, split the component into a small server wrapper and a focused client component so the parent can pass ordinary data/config props while the wrapper owns the auth/data branch. Prefer that extra file over making a parent know internal authenticated child components or moving the boundary outward. When the client component itself needs server Suspense, such as for route hooks under Cache Components, keep the boundary but use `fallback={null}` for trivial immediate hooks like `usePathname`; add visible fallback UI only for real slow work such as auth checks, database queries, network calls, or useful skeleton states.
- Move immediate follow-up mutations into the initial array or object declaration when the value is unconditional.
- Remove intermediate arrays or objects that only name one step in a fluent transformation before being immediately consumed.
- Do not add dedupe passes, `Set` conversions, or uniqueness guards unless duplicates can actually enter from the data source or user flow. When uniqueness is enforced by schema, database constraints, or filtered UI options, use direct membership checks or trust the invariant instead of suggesting duplicate records are possible.
- Check string construction. Prefer plain concatenation when it is clearer than a template literal wrapped around short fragments or conditionals; keep template literals when interpolation improves readability.
- Remove JSX fragments with zero or one meaningful child; return the child directly instead.
- Check repeated loops over the same collection. Combine them when one pass can gather the needed values without making the code harder to read.
- Remove pass-through helpers, wrappers, constants, and barrels unless they reduce real repeated complexity or expose a requested public API.
- Check helpers whose whole body is a single call to another local helper. Keep the name that best describes the real operation, and remove or inline the other helper unless it is a deliberate compatibility alias, preset, or public API boundary.
- In component wrappers, do not destructure props only to pass them through unchanged. Leave ordinary child-component props in `...props`; separate only values the wrapper reads, transforms, branches on, or defaults. When supplying a wrapper default that callers may override, pass the default before `{...props}`.
- Before keeping a new feature, helper, component, hook, field, or API utility, search for the closest existing Kenstack/admin/forms/list/page-editor implementation. If the new code duplicates behavior too closely, reuse the existing piece, extend it at the shared owner, or explain why the local version is intentionally different.
- Keep data loading at the narrowest boundary that consumes the data. Avoid aggregate helpers that return mixed concerns, such as config, auth state, routing decisions, and page-specific records, just to simplify a parent. Extract a loader only when it owns a clear cache/API boundary, is reused, or gives a specific data shape a clear name.
- Avoid rename-only or move-only churn. Preserve existing local type names, variable names, and declaration placement unless the new name or location makes a real behavior, ownership, or API boundary clearer.
- Avoid thin wrappers around stable library APIs when the wrapper only renames the library function or hides a one-line call. Keep a wrapper only when it enforces project policy, preserves a boundary such as server/client separation, normalizes repeated nontrivial behavior, or isolates an unstable dependency.
- Do not pass through unused option fields just because a shared options type supports them. Keep function parameters to the fields the function reads, and split or narrow option types when forwarding extra fields would obscure ownership.
- Before keeping local string/date/collection formatting logic, check whether an existing installed utility already owns that behavior, such as `lodash-es`, `pluralize`, `date-fns`, `chrono-node`, or `validator`.
- Check one-line `is*`, `get*`, and `has*` helpers. Remove them when they only hide a direct discriminator check, property lookup, or local ternary and do not provide meaningful reuse, validation, or type narrowing across an unsafe boundary. This includes wrappers around query/API result statuses, such as `isSuccess(data)` for `data?.status === "success"`.
- When touching a file, review nearby private helpers that predate the current change. Inline helpers that only return an optional property, defaulted object, mapped key list, or one local branch. Keep helpers that provide real generic narrowing, validation of external/unknown data, shared behavior, or a meaningful domain boundary.
- Review each newly added function, type, helper, and local alias one by one. Keep it only if it meaningfully improves inference, readability, reuse, validation, or a real boundary; remove it if it merely renames a direct expression, works around a local type issue, or anticipates future use.
- Review types with `Base` in the name. Keep them only when the shared base is meaningfully reused and makes the composed types easier to understand; inline them when they only factor out one small property group or exist for anticipated reuse.
- Flatten nested guard `if` statements when the inner branch only returns, throws, continues, or breaks and the combined condition remains readable.
- Check adjacent JSX branches that return the same wrapper component with only small prop or child differences. Collapse the common wrapper when it stays readable, such as rendering a `Link` child only for the enabled case instead of duplicating the surrounding button.
- Check factory or maker functions whose body only returns a value such as `pipelineStage(...)`. Prefer concise arrow returns unless the function needs setup, branching, or named intermediate values.
- Inline typed configuration objects at the typed call site so contextual typing and excess property checks work there.
- Check styling props. If a prop only toggles a small class preset, prefer `className`, composition, or a local wrapper over component-specific mode props.
- Avoid creating alternate return shapes, enhanced schemas, or parallel config objects when the original can be defined correctly at the point of use.
- Do not split simple local logic into builder, mapper, normalizer, converter, or adapter functions unless the split removes meaningful repeated complexity.

## Cleanup Definition

Cleanup means making already-touched code simpler, clearer, or more consistent without changing behavior, ownership, or API shape.

Good cleanup:

- Remove dead comments, unused variables, and stale imports.
- Inline one-use helpers or types that only rename a direct expression.
- Apply mechanical shape changes consistently, such as option tuple to object entries.
- Fix typos, formatting drift, and obvious duplicated branches.

Not cleanup:

- Adding runtime indirection, dynamic imports, wrappers, compatibility shims, or new abstractions solely to satisfy a local check.
- Making site-bound code generic inside Kenstack when the direct site dependency is the real contract.
- Moving complexity to another file instead of removing it.
- Broadening public APIs or ownership boundaries for anticipated reuse.

If a check fails because the check scope does not match the code's intended runtime context, prefer fixing the check scope or calling out the mismatch instead of adding ceremony to the code.

## Field And Form Behavior

- Keep field definitions, field helpers, field handlers, field lifecycle code, and field-based record helpers in `src/fields` when they are reusable outside admin.
- Do not hand-plumb save, load, delete, display, list, filter, or sort behavior in actions when the field lifecycle should own it.
- Ensure client field definitions stay client-safe; server-only handlers and transforms should be applied through server field helpers.
- For forms, rely on schema/default/mutation inference instead of repeating generic arguments at usage sites. In particular, review `useForm<...>()`, `useFormContext<...>()`, and similar context-hook calls by first trying the unparameterized call.

## Files And Boundaries

- Keep top-level feature folders reserved for primary APIs and major entry points.
- Put support code in existing secondary folders such as `lib`, `components`, `api`, or `fields`.
- Do not put module infrastructure in `modules`; that folder is for actual modules and module-owned files.
- Do not add compatibility shims, pass-through re-exports, or barrels unless explicitly requested or already established as a public API.
- For internal moves, update the internal call sites to the new owner and delete the old file. Do not leave old-path wrapper components, re-export files, or local adapter imports just to make the move feel smaller.
- When moving or renaming a tracked repository file, use `git mv` so the move is recorded deliberately instead of leaving Git to infer it from separate delete/add changes.
- When deleting a tracked repository file, use `git rm` so the deletion is recorded deliberately instead of leaving Git to infer it from a filesystem delete.
- If a rename or API shape change only touches uncommitted work, remove old names directly. Do not preserve compatibility aliases or temporary exports for code that has not shipped.

## Behavior

- Preserve existing capabilities such as caching, validation, permissions, publishing rules, extension points, query behavior, and revalidation.
- Keep cache tags near `"use cache"` and `cacheLife(...)` as high in the function as behavior allows.
- When server loaders might be called from more than one component or query path during a single page render, wrap the shared DB/API work in `React.cache` so duplicate calls dedupe within the request. Prefer primitive cache keys or stable arguments so equivalent calls actually hit the same cache entry.
- Do not remove configurability or behavior to make a cleanup easier without confirming first.
- Check pipeline actions for guard-only stages that just return an error. Prefer one normal stage with the guard inside the handler unless the separate stage materially changes auth, schema parsing, or external behavior.
- Check `useEffect` usage, especially around React Query. Effects should synchronize with an external system; avoid effects that only mirror derived state, inspect query data/errors, log results, or perform work that belongs in query/mutation callbacks, route actions, or explicit event handlers.
- When several components consume the same React Query result from a context/provider, handle no-data and query/app-level error states at that shared boundary. Child components should render their local loading/content/empty states and assume the provider has already dealt with an unusable shared query.
- For simple React Query controls that toggle one value or add/remove one visible item, avoid optimistic `onMutate` cache rewrites unless other visible shared UI must change immediately. Keep `mutation.isPending` visible when deriving the pending control state from `mutation.variables`, let `onSuccess` handle app-level `{ status: "error" }`, let `onError` handle thrown or unexpected failures, and replace shared cache state from the server response.
- Check local `mounted`, `active`, and `cancelled` flags in effects. Remove them when they only guard a one-shot async state update after unmount; keep cleanup when it cancels a real external resource or prevents stale results from competing effect inputs.
- Check whether client and server parse the same payload, query state, filters, or form values with separate schemas. Share the common schema or schema helper where possible so validation and coercion do not drift.
- For every `pipelineStage({ schema })`, scan the handler for `.parse(...)`, `.safeParse(...)`, hand-written validation, or request-field reshaping against `data`, `dataIn`, or the same submitted fields. Move that logic into the pipeline schema so `z.output<typeof schema>` is the shape the action consumes. Keep client-only raw form schemas separate from action schemas when needed.
- Keep URL/search-param parsing at the loader or action boundary. Server components should pass raw `searchParams` to the query loader instead of rebuilding list/query objects at the render call site.
- Check hand-written validators and `value is ...` guards against existing Zod schemas. Prefer the canonical schema for submitted data unless the guard is only a lightweight UI/rendering branch.
- Check field lifecycle behavior for duplicate schema parsing. If the action pipeline already parsed the payload, do not parse again inside the handler; use the parsed value shape at the lifecycle boundary.
- Check for placeholders, dummy values, temporary review states, test-only copy, fake data, and scaffold comments. Remove them before finalizing unless the user explicitly asked to keep them.

## Final Checks

- Run the narrowest relevant checks: TypeScript for type changes, lint for style changes, and build only for runtime-sensitive Next.js changes unless instructed otherwise.
- Review the diff for unrelated formatting, file moves, or broad refactors.
- Do not flag staged-vs-unstaged split state as a review finding by itself. Treat it as normal WIP unless the actual code in the working tree is broken or the user explicitly asks for staging hygiene.
- If a checklist item would make the code more complex for the same result, leave the code alone and mention the tradeoff.

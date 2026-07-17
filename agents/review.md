# Review Checklist

Use this checklist before finalizing code changes. It is meant to catch project preferences that are easy to miss during implementation.

Our primary review goal is to keep the code simple, direct, and easy to follow.

Evaluate all changes through that lens. Prefer clear, explicit code over unnecessary abstraction. Avoid indirection, cleverness, duplication, and redundant structure unless they provide a clear practical benefit.

Confirm that the change threshold from `agents.md` was applied before editing. Every hunk must produce a concrete current improvement; runtime-equivalent, inference-neutral, readability-neutral, rename-only, and merely alternative implementations indicate that the change should not have been made. Review should catch violations, but the primary rule is to avoid creating them in the first place.

Configured Prettier output is the exception. Treat formatting-only changes produced by Prettier in in-scope or touched files as deterministic mechanical work: stage them, and do not raise them as review findings.

When reviewing, look for opportunities to reduce complexity, improve readability, and make the intent of the code obvious to the next developer.

When delegating code review or cleanup work, instruct the agent to check for reinvented Kenstack primitives, especially popovers, dialogs, menus, tooltips, buttons, skeletons, list controls, form controls, query/error states, and loading states. If a shared primitive exists, the reviewer should recommend or apply the replacement.

For database and schema changes, also check for existing Kenstack table and field helpers before accepting a hand-written Drizzle/Zod shape. Standard helper-owned shapes such as tag relation tables should use the helper unless the custom table materially differs.

Before reviewing the diff details, confirm the relevant `agents/*.md` guidance for the touched area was considered. Do not read every area file by default; route the review to the files that match the touched code:

- Admin routes, modules, forms, lists, sidebars, or admin layout: read `agents/admin.md`.
- UI components, styling, overlays, interactions, visual states, or shared controls: read `agents/ui.md`.
- Drizzle tables, Zod schemas, validation, pipeline actions, persistence, or database behavior: read `agents/data.md`.
- Type aliases, interfaces, overloads, generics, casts, explicit return annotations, or type-heavy helper APIs: read `agents/typescript.md`.
- Kenstack API, export, helper, type, route, or behavior compatibility changes: read `agents/migrations.md`.
- Errors, warnings, broken states, failing tests, runtime exceptions, or bug-fix/debugging work: read `agents/debug.md`.

During review, look for any newly duplicated source of truth, such as copied identifiers, labels, options, mappings, statuses, schemas, config, or metadata. Reuse or extend the existing owner instead of keeping a parallel version. Treat paired signals where one value is canonical and the other is only a request, prop, local, or descriptive copy as a sign to inspect the surrounding code path. If disagreement only causes an error, recommend deriving from the canonical owner and pruning the duplicate input, validation branch, helper argument, schema field, or API path.

Before accepting a new helper, formatter, parser, normalizer, or utility, search the whole project and its shared submodules for existing behavior with the same input and output semantics. Reuse or narrowly extend the canonical helper instead of keeping local copies in separate modules, pages, or admin components. Similar names or implementation details alone do not make helpers equivalent; preserve separate owners when their contracts genuinely differ, such as calendar-only dates, timestamps, and timezone-aware values.

## Directness Review

Apply the **Directness Gate** in `../AGENTS.md` as the first mandatory code-shape pass. Perform its mechanical audit over every changed TypeScript file, not only files that already look over-abstracted. Treat every unexplained candidate as a review finding; remove it during cleanup or record the concrete current reason it remains.

## Type Shape

- Read `agents/typescript.md` before reviewing TypeScript-heavy changes.
- Treat Kenstack dependency mocks as standalone-check harnesses, not as the authority for consumer-facing contracts. Review `@app/deps` types against a representative consuming application and flag any exact schema, inference, or capability that was weakened to satisfy the mock or avoid a circular type error.
- List every new or changed local type alias, interface, overload, generic argument, explicit return annotation, and cast in each touched TypeScript file.
- Keep each one only when it satisfies the focused TypeScript policy: exported/public contract, meaningful reuse, domain concept, noisy boundary clarification, or real external/generic/schema/Drizzle/form/untyped boundary protection.
- Remove fake precision and inferred mirrors, especially `*Row`, `*Result`, `*Response`, `*Options`, `Resolved*`, `Defined*`, `Base*`, explicit hook generics, broad result casts, and `FetchResult & { status: "success" }`-style success aliases.
- If applying `agents/typescript.md` would make the code harder to read or require broader API churn, keep the type and call out the tradeoff instead of forcing a messy cleanup.

## Local Code Shape

- Important exception: do not inline auth/current-user lookups into query predicates or other behavior-defining expressions. Resolve values such as `const user = await deps.auth.requireUser()` and `const userId = user.id` near the top of the nearest function boundary so user-scoped behavior is obvious during review.
- After deriving a value from a condition, avoid re-checking the same condition or source fields in adjacent code. Reuse the derived value or split the logic into explicit branches when that reads clearer.
- When both branches of a conditional apply the same wrapper, coercion, fallback, or formatting helper, move that shared operation outside the conditional so the branch only chooses the differing value.
- Avoid nested ternaries for multi-way choices, especially discriminator-to-label/icon/component mappings. Prefer a `switch` or explicit branches so each case is named plainly.
- Check callback/helper names against their side effects. Helpers named like readers or calculations, such as `get*`, `calculate*`, `compute*`, `derive*`, or `resolve*`, should not call React state setters, mutate refs/DOM, or also return a computed value after mutating state. Keep pure calculation separate from event, effect, and state-sync handlers. It is fine for an obviously side-effecting setter or handler to update several related state values when the name and call site make that explicit.
- Do not pass `initial*` props that duplicate data already owned by the same query, context, or provider. Seed the shared state at the boundary and read it from one source.
- Remove generic temporary variables that merge distinct cases only to feed a nearby branch or call. Prefer explicit branches when the cases have different domain meanings, such as separate list-record and single-record cache targets.
- Prefer direct guard returns for terminal UI states such as errors, empty states, redirects, and permission denials. Do not gather a temporary message or status value only to render that terminal branch a few lines later.
- Before keeping local JSX helpers or hand-rolled styled markup for common UI states such as errors, loading, empty, success, or informational messages, check for an existing shared primitive or local component owner. Use that existing component, or create one at the right owner if the pattern is truly missing, instead of copying class strings into each feature.
- Check state-specific JSX helpers and component branches for duplicated section, card, heading, or layout shells. When one component owns all states, render the shell once and put loading/error/empty/content branching inside it instead of swapping whole outer components. Use a shared shell helper only when that shell is reused across separate components or distant call sites.
- For Suspense around auth/data branches, keep the boundary at the smallest server-rendered branch that actually awaits the data. Do not wrap a whole navigation, page section, card, or layout shell when only one nested item depends on async/auth state. Render the stable shell once, and suspend only the auth/data-dependent child slot. The authenticated/suspended component should render only the private or async-dependent fragment, not the whole parent/client component with public props passed through. Public links, shells, headings, sections, and other always-visible UI should be rendered outside the auth/data branch even when nearby client behavior needs its own wrapper. If that slot lives inside a client component, split the component into a small server wrapper and a focused client component so the parent can pass ordinary data/config props while the wrapper owns the auth/data branch. Prefer that extra file over making a parent know internal authenticated child components or moving the boundary outward. When the client component itself needs server Suspense, such as for route hooks under Cache Components, keep the boundary but use `fallback={null}` for trivial immediate work that resolves before the fallback is visibly displayed. Require visible fallback UI only when waiting can be perceived and removing the suspended content would cause a useful shell to disappear or surrounding chrome, especially a header and footer, to collapse together.
- Move immediate follow-up mutations into the initial array or object declaration when the value is unconditional.
- Remove intermediate arrays or objects that only name one step in a fluent transformation before being immediately consumed.
- Do not add dedupe passes, `Set` conversions, or uniqueness guards unless duplicates can actually enter from the data source or user flow. When uniqueness is enforced by schema, database constraints, or filtered UI options, use direct membership checks or trust the invariant instead of suggesting duplicate records are possible.
- Check string construction. Prefer plain concatenation when it is clearer than a template literal wrapped around short fragments or conditionals; keep template literals when interpolation improves readability.
- Remove JSX fragments with zero or one meaningful child; return the child directly instead.
- When the same collection is looped more than once, check whether each pass earns its place. Multiple passes are fine when they express distinct phases or materially improve clarity, but repeated `map` / `filter` / `find` chains over the same data often indicate avoidable churn. Prefer one direct pass when it can validate, classify, or accumulate the needed outputs without hiding the logic.
- In formatter or normalizer helpers that transform only a few fields from a closed local object shape, destructure the fields that change and spread the untouched rest into the returned object. Use this for known local shapes such as explicit Drizzle projections or locally built draft objects. Do not spread broad external input, request bodies, parsed `unknown`, select-star rows, or user-controlled objects where extra fields could leak into output.
- Before keeping a new feature, helper, component, hook, field, or API utility, search for the closest existing Kenstack/admin/forms/list/page-editor implementation. If the new code duplicates behavior too closely, reuse the existing piece, extend it at the shared owner, or explain why the local version is intentionally different.
- For new or changed shared React controls, check current React docs for APIs that may have changed. Do not introduce deprecated React patterns when the installed version supports the simpler current syntax, such as passing `ref` as a prop instead of using `React.forwardRef`.
- Keep data loading at the narrowest boundary that consumes the data. Avoid aggregate helpers that return mixed concerns, such as config, auth state, routing decisions, and page-specific records, just to simplify a parent. Extract a loader only when it owns a clear cache/API boundary, is reused, or gives a specific data shape a clear name.
- Avoid rename-only or move-only churn. Preserve existing local type names, variable names, and declaration placement unless the new name or location makes a real behavior, ownership, or API boundary clearer.
- Do not pass through unused option fields just because a shared options type supports them. Keep function parameters to the fields the function reads, and split or narrow option types when forwarding extra fields would obscure ownership.
- Before keeping local string/date/collection formatting logic, check whether an existing installed utility already owns that behavior, such as `lodash-es`, `pluralize`, `date-fns`, `chrono-node`, or `validator`.
- Review types with `Base` in the name. Keep them only when the shared base is meaningfully reused and makes the composed types easier to understand; inline them when they only factor out one small property group or exist for anticipated reuse.
- Flatten nested guard `if` statements when the inner branch only returns, throws, continues, or breaks and the combined condition remains readable.
- Check adjacent JSX branches that return the same wrapper component with only small prop or child differences. Collapse the common wrapper when it stays readable, such as rendering a `Link` child only for the enabled case instead of duplicating the surrounding button.
- Check styling props. If a prop only toggles a small class preset, prefer `className`, composition, or a local wrapper over component-specific mode props.
- Avoid creating alternate return shapes, enhanced schemas, or parallel config objects when the original can be defined correctly at the point of use.
- Check call sites for leaked implementation detail. If several adjacent calls, temporary values, or helper compositions are only assembling one conceptual operation, move that behavior behind the function that owns it instead of making each caller know the steps. Do not hide genuinely different decisions, but avoid forcing callers to repeat sequencing such as read-then-attach, normalize-then-apply, or resolve-then-preserve when one well-named function can express the operation.

## Cleanup Definition

Cleanup means making already-touched code simpler, clearer, or more consistent without changing behavior, ownership, or API shape.

Good cleanup:

- Remove dead comments, unused variables, and stale imports.
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
- Before adding custom form behavior, check whether Kenstack already owns it through field component props, field schemas, React Hook Form blur/submit validation, or field lifecycle behavior such as server fields, select/load/save transforms. Do not add input-level guards, mirrored local state, custom `onChange` filtering, duplicate validation, or convenience formatting unless the existing Kenstack field lifecycle cannot express the behavior. Prefer schema-owned validation and field lifecycle transforms over bespoke component behavior.
- Validation messages should be short sentence-case fragments without trailing periods, such as `Enter a valid date like June 25, 2026`, not full punctuated sentences.
- Flag any site/module field object that hand-writes `__kenstackField`. That marker is an internal helper contract; replace the object with `field(...)` for custom values or a standard convenience helper for normal inputs.
- Check field definitions for restated defaults. Remove options such as `searchable: false` or `revisions: true` when they only repeat `defineFields` behavior; keep explicit values when they change behavior, such as `revisions: false`.
- Review local field-schema aliases as indirection. A helper or constant that only names a short Zod preprocess, coerce, or format chain for a couple of nearby fields usually belongs inline; keep it when it owns a canonical field pattern, meaningful per-call options, or repeated complexity that would be harder to audit at each field.
- Do not hand-plumb save, load, delete, display, list, filter, or sort behavior in actions when the field lifecycle should own it.
- Ensure client field definitions stay client-safe; server-only handlers and transforms should be applied through server field helpers.
- Do not pre-trim or otherwise pre-normalize `watch(...)` / `form.watch(...)` values before passing them to request builders, search URL builders, or action helpers that already normalize. Keep normalization at the boundary helper/schema; derive a local normalized value only for immediate UI behavior such as enabling or disabling a control.
- For forms, rely on schema/default/mutation inference instead of repeating generic arguments at usage sites. In particular, review `useForm<...>()`, `useFormContext<...>()`, and similar context-hook calls by first trying the unparameterized call.
- Treat form `defaultValues` as initial state, not a reactive reset mechanism. Prefer module-scope constants for static defaults when they naturally live outside render or are reused for explicit resets, and pass server-derived defaults through serialized props when they depend on server data. Do not add `useMemo` only to stabilize `defaultValues`; use a key/remount at the record or route-input boundary when changing defaults should reset the form. If a form needs to reset after submit, do it explicitly from the mutation/navigation path.

## Files And Boundaries

- Check Kenstack imports for site-specific paths or aliases. Code under `kenstack/` must not import host-site modules directly, including `@/`, root `src/`, relative paths into the host app, or site module paths. All host-site dependencies must flow through the explicit dependency boundary at `@app/deps` or `@app/deps/*`.
- Keep top-level feature folders reserved for primary APIs and major entry points.
- Put support code in existing secondary folders such as `lib`, `components`, `api`, or `fields`.
- Do not put module infrastructure in `modules`; that folder is for actual modules and module-owned files.
- Check runtime boundaries on exports and barrels. Isomorphic code must not be re-exported through a server-only barrel just because current callers are server-side; keep it on an isomorphic entry point or subpath. Likewise, do not expose server-only code through client or shared entry points.
- Keep server-only helpers separate from helpers consumed by Client Components. Do not put `server-only` fetchers, database queries, HTML parsers, API action internals, or server lifecycle helpers in the same module as client-used request builders, URL builders, field helpers, option lists, or presentation helpers. Move API-only helpers under the module's `api/` folder or another server-owned path, and keep shared helpers in an isomorphic file.
- For internal moves, update the internal call sites to the new owner and delete the old file. Do not leave old-path wrapper components, re-export files, or local adapter imports just to make the move feel smaller.
- When moving or renaming a tracked repository file, use `git mv` so the move is recorded deliberately instead of leaving Git to infer it from separate delete/add changes.
- When deleting a tracked repository file, use `git rm` so the deletion is recorded deliberately instead of leaving Git to infer it from a filesystem delete.
- If a rename or API shape change only touches uncommitted work, remove old names directly. Do not preserve compatibility aliases or temporary exports for code that has not shipped.

## Behavior

- Preserve existing capabilities such as caching, validation, permissions, publishing rules, extension points, query behavior, and revalidation.
- Check server code for accidental tests against client-only components, dynamic client loaders, or client registries. Server routes and loaders should not decide route existence, permissions, or data availability by checking whether client UI code exists; client components and registries do not reliably exist in the server boundary. For admin routes, validate route existence from server-owned module config such as `moduleConfig.admin`, and validate client config only inside the client components that consume it.
- Keep cache tags near `"use cache"` and `cacheLife(...)` as high in the function as behavior allows.
- For user-visible cached loaders whose result depends on `publishedAt`, `publishedAt <= now()`, or `Date.now()` for publishing visibility, use an hours-or-shorter cache lifetime. Do not use `cacheLife("days")` or `cacheLife("max")` unless the loader cannot hide future-published content or another mechanism guarantees timely invalidation.
- When server loaders might be called from more than one component or query path during a single page render, wrap the shared DB/API work in `React.cache` so duplicate calls dedupe within the request. Prefer primitive cache keys or stable arguments so equivalent calls actually hit the same cache entry.
- Do not remove configurability or behavior to make a cleanup easier without confirming first.
- Check pipeline actions for guard-only stages that just return an error. Prefer one normal stage with the guard inside the handler unless the separate stage materially changes auth, schema parsing, or external behavior.
- Check `useEffect` usage, especially around React Query. Effects should synchronize with an external system; avoid effects that only mirror derived state, inspect query data/errors, log results, or perform work that belongs in query/mutation callbacks, route actions, or explicit event handlers.
- Review `useSyncExternalStore` against its actual contract. Keep it for values owned outside React with meaningful subscription and snapshot behavior; replace no-op subscription hydration gates with deterministic initial state and a post-hydration effect. Accept a narrow, explained `react-hooks/set-state-in-effect` suppression when the effect genuinely restores browser-only state.
- When several components consume the same React Query result from a context/provider, handle no-data and query/app-level error states at that shared boundary. Child components should render their local loading/content/empty states and assume the provider has already dealt with an unusable shared query.
- For simple React Query controls that toggle one value or add/remove one visible item, avoid optimistic `onMutate` cache rewrites unless other visible shared UI must change immediately. Keep `mutation.isPending` visible when deriving the pending control state from `mutation.variables`, let `onSuccess` handle app-level `{ status: "error" }`, let `onError` handle thrown or unexpected failures, and replace shared cache state from the server response.
- Check local `mounted`, `active`, and `cancelled` flags in effects. Remove them when they only guard a one-shot async state update after unmount; keep cleanup when it cancels a real external resource or prevents stale results from competing effect inputs.
- Check whether client and server parse the same payload, query state, filters, or form values with separate schemas. Share the common schema or schema helper where possible so validation and coercion do not drift.
- For every `pipelineStage({ schema })`, scan the handler for `.parse(...)`, `.safeParse(...)`, hand-written validation, or request-field reshaping against `data`, `dataIn`, or the same submitted fields. Move that logic into the pipeline schema so `z.output<typeof schema>` is the shape the action consumes. Keep client-only raw form schemas separate from action schemas when needed.
- Keep URL/search-param parsing at the loader or action boundary. Server components should pass raw `searchParams` to the query loader instead of rebuilding list/query objects at the render call site.
- Check hand-written validators and `value is ...` guards against existing Zod schemas. Prefer the canonical schema for submitted data unless the guard is only a lightweight UI/rendering branch.
- Check field lifecycle behavior for duplicate schema parsing. If the action pipeline already parsed the payload, do not parse again inside the handler; use the parsed value shape at the lifecycle boundary.
- Review every Drizzle `.select()` with no projection. If the caller only reads a few fields, require an explicit projection instead. Treat select-star plus a result cast as a cleanup finding unless full-row behavior is required and documented.
- Check for placeholders, dummy values, temporary review states, test-only copy, fake data, and scaffold comments. Remove them before finalizing unless the user explicitly asked to keep them.

## Final Checks

- Run the narrowest relevant checks: TypeScript for type changes, lint for style changes, and build only for runtime-sensitive Next.js changes unless instructed otherwise.
- Review the diff for unrelated formatting, file moves, or broad refactors.
- Do not flag staged-vs-unstaged split state as a review finding by itself. Treat it as normal WIP unless the actual code in the working tree is broken or the user explicitly asks for staging hygiene.
- If a checklist item would make the code more complex for the same result, leave the code alone and mention the tradeoff.

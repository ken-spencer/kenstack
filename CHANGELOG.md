# Kenstack Changelog

Migration notes for committed Kenstack API changes, newest release first. The authoring and release
contract lives in `docs/upgrading.md`.

## Unreleased

### Sortable Activation

Old API:

- `SortableList` always used dnd-kit's `PointerSensor`, so any pointer type dragged a `SortableItem`
  after a short distance, and every item carried `touch-none`, which blocked touch scrolling over
  the list.

New API:

- `SortableList` takes `activator?: "handle" | "item"` (default `"item"`). With `"item"` a mouse
  drags after a short distance and a touch after a short hold, and items no longer carry
  `touch-none`, so touch scrolling wins unless the user holds. With `"handle"` only a
  `SortableHandle` rendered inside the item starts a drag; it carries the drag listeners, dnd-kit's
  aria attributes, and `touch-none`, and stays focusable while reordering is disabled.
- `SortableHandle` is exported from `@kenstack/components/SortableList`.

Migration steps:

- Lists whose items are mostly links or buttons: pass `activator="handle"` and render
  `<SortableHandle />` inside each `SortableItem`.
- Whole-item drags need no change; touch users now hold briefly before a drag starts.

### React 19.2 Floor

Old API:

- Peer dependencies accepted any React 19 release.

New API:

- `StepFlow` and the form provider rely on React 19.2's `Activity`, so `react`, `react-dom`, and
  `@types/react` require 19.2 or later.

Migration steps:

- Upgrade the host to React 19.2 or later before taking this version.

### Access Type Owner

Old API:

- `UserAccess` from `@kenstack/auth/types` typed the `access` option of `pageRoute(...)` and
  `pipeline(...)`.

New API:

- `AuthAccess` from `@kenstack/auth/server/auth` is the same union
  (`"authenticated" | Role | readonly Role[]`); `@kenstack/auth/types` is removed.

Migration steps:

- Replace `import type { UserAccess } from "@kenstack/auth/types"` with
  `import type { AuthAccess } from "@kenstack/auth/server/auth"`.

### ESLint Config Entry

Old API:

- Hosts imported the shared configuration from `./kenstack/eslint.config.mjs`.

New API:

- The configuration lives at `./kenstack/eslint.config.js` and also exports
  `deepRelativeImportPattern` for host `no-restricted-imports` rules.

Migration steps:

- Update the import specifier in the host `eslint.config.js`.

### Login Redirect Responses

Old API:

- `response.redirectToLogin()` in a pipeline stage returned HTTP 200 with a payload holding only
  `redirect`.

New API:

- `response.redirectToLogin()` returns `response.error({ message, redirect, status: 401 })`: HTTP 401,
  `status: "error"`, a sign-in message, and the same `/login?loginMessage=...` path.

Migration steps:

- `fetcher(...)` callers need no change; the browser is still sent to `redirect`.
- Code that reads the pipeline response directly must treat the result as an error and follow
  `redirect` from it.

### Submit Button Type

Old API:

- `Submit` accepted every `ButtonProps` member, including `type`, but always rendered
  `type="submit"`.

New API:

- `type` is omitted from the accepted props; passing it is a type error instead of a silent override.

Migration steps:

- Remove `type` from `<Submit>` usages.

### Request-Derived Absolute URLs

Old APIs:

- `getOrigin()` from `@kenstack/lib/getOrigin` read the current headers and returned an origin string.
- `createDeps({ siteUrl })` accepted and exposed a site URL without using it in Kenstack.

New pattern:

- Build request-scoped absolute URLs with the standard `URL` API and the current request URL.

Migration steps:

- Replace `new URL(path, await getOrigin())` and request-scoped uses of `deps.siteUrl` with
  `new URL(path, request.url)`. Read `request.nextUrl.origin` when only the origin is needed.
- If a site still needs a fixed canonical URL outside a request, keep that value in site-owned
  configuration instead.

### Direct Host Bindings

Old API:

- Sites called `createDeps(...)` to assemble database, authentication, logger, module, role, email, and
  error-reporting services into one runtime `deps` object.
- Auth and logger APIs were created and cross-wired through `createAuth(...)`, `createUser(...)`,
  `createAuthState(...)`, `new Logger(...)`, and `logger.bindAuth(...)`.
- `createDeps({ uploadMaxImageSize })` supplied one site-wide fallback upload limit.
- Kenstack's standalone compiler depended on `src/deps/mock.ts` and `@app/deps/roles`.

New API:

- `createDeps(...)` and the `@kenstack/deps` entry point are removed.
- Hosts map `@app/db`, `@app/email`, `@app/modules`, and `@app/roles` to their canonical owners,
  which export:
  - `@app/db`: the named `db` returned by `createDb({ schema })`.
  - `@app/modules`: the named `modules` registry from `defineAdmin(...)`, including a `users` module
    whose `admin.table` is the auth users table.
  - `@app/roles`: the role registry as the default export (`@kenstack/auth/roles` unless the host
    overrides it).
  - `@app/email`: the named `EmailContainer`, `attachments`, and `loadEmailFrom`.
  `mocks/app/*` in Kenstack is the reference shape for each binding.
- Auth exports named functions directly from `@kenstack/auth/server`; Kenstack features may import the
  narrower `auth/server/auth`, `auth/server/state`, or `auth/server/user` owner.
- Audit callers, including auth, import `audit(...)` from `@kenstack/logger`.
- Roles default to `@kenstack/auth/roles`. Email sender and presentation bindings come from
  `@app/email`; `EmailAddress` is exported by `@kenstack/lib/mailer`.
- Uploads default to 5 MiB unless a field supplies `uploadMaxSize` and, optionally,
  `uploadMaxSizeMessage`.
- Kenstack maps the same `@app/*` names to `mocks/app/*` for standalone typechecking and unit tests.

Migration steps:

- Keep the site's schema-aware database entry:

  ```ts
  import "server-only";

  import { createDb } from "@kenstack/db";

  import * as tables from "./tables";

  export const db = createDb({ schema: tables });
  ```

- Add host path mappings:

  ```json
  {
    "@app/db": ["./src/db/index.ts"],
    "@app/email": ["./src/email/index.ts"],
    "@app/modules": ["./src/modules/index.ts"],
    "@app/roles": ["./src/roles.ts"]
  }
  ```

- Replace `deps.db`, `deps.modules`, and `deps.email` reads with imports from the corresponding host
  owner. Import Kenstack-owned tables from their table owner instead of a host table registry.
- Replace `deps.auth.<method>` with the named auth export, `deps.logger.audit(...)` with `audit(...)`,
  and `deps.error(...)` with `reportError(...)` from `@kenstack/lib/errorReporter`.
- Configure `FROM_ADDRESS` for monitoring alerts sent by `reportError(...)`. Transactional email keeps
  using `loadEmailFrom` from `@app/email`; the two sender configurations have different owners.
- Replace a former global `uploadMaxImageSize` override with `uploadMaxSize` on each file, image, or
  media-list field that must differ from the 5 MiB default. Move custom validation copy to that field's
  `uploadMaxSizeMessage`.
- Move the host role registry to `src/roles.ts`; a host using only the default administrator role may
  re-export `@kenstack/auth/roles`.
- Remove the host dependency module after its consumers are migrated.

### Idempotent Query Provider

Old APIs:

- The default `QueryProvider` always created and supplied a new TanStack query client.
- It persisted queries whose first key was `"user-info"` to browser `localStorage` for up to 12 hours.
- `QueryBoundary` was the separate named export for callers that needed to reuse an existing client or
  create one when absent.

New API:

- The default `QueryProvider` reuses the current query client when one exists and creates one only when
  needed. `QueryBoundary` is removed.
- The default provider no longer persists user information or any other query across page loads.

Migration steps:

- Replace named `QueryBoundary` imports and JSX with the default `QueryProvider`:

  ```tsx
  import QueryProvider from "@kenstack/context/QueryProvider";

  <QueryProvider>{children}</QueryProvider>;
  ```

- A site that intentionally relied on a nested `QueryProvider` to isolate part of its query cache must
  replace it with an explicitly owned TanStack client. Keep that client stable across renders and set
  any site-required query defaults deliberately:

  ```tsx
  "use client";

  import { useState, type ReactNode } from "react";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

  export default function IsolatedQueryProvider({
    children,
  }: {
    children: ReactNode;
  }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  ```

  Ordinary nested `QueryProvider` calls now share the owning client.
- Remove assumptions that `user-info` survives a reload for up to 12 hours. The current authentication
  state is loaded from the server and may be fetched again on the client.
- A site that deliberately requires persisted queries must own and configure a TanStack
  `PersistQueryClientProvider` outside Kenstack's `QueryProvider`, including its storage, maximum age,
  and `shouldDehydrateQuery` policy. Kenstack will reuse that owning client.

### Account Menu Auth-State Resolver

Old API:

- An `AccountMenuItemsResolver` received the complete `User` record. Its numeric identifier was `id`,
  and the record included `middleName`.

New API:

- The resolver receives the authenticated member of `PublicAuthState`. It includes the
  `state: "authenticated"` discriminant and the public account-menu fields; its numeric identifier is
  `userId`, and it does not expose `middleName`.

Migration steps:

- Change resolver reads from `user.id` to `user.userId`.
- Remove `middleName` reads. Use the supplied `name`, `initials`, `givenName`, or `familyName` display
  fields as appropriate.
- If a resolver needs data outside the public authentication state, load that data in the resolver
  from its authoritative server owner instead of expecting the account menu to provide the full user
  record.

### Activity-Preserved Form Drafts

Old behavior:

- `FormProvider` reset every field when React disconnected its layout effects. Next.js uses that same
  lifecycle when an `Activity` hides a route, so navigating away discarded unfinished form values.
- Custom create flows could accidentally depend on that global reset to clear a completed new record.

New behavior:

- Forms preserve their field values while an `Activity` hides them. Transient status and upload state
  still clear when the form is hidden.
- Kenstack's built-in admin editor explicitly resets a successfully created record before navigating
  from the new-record page to the saved record.

Migration steps:

- Audit custom create flows outside Kenstack's admin editor, including issue trackers and other
  new-record screens. If a successful create navigates away, reset that completed transaction in its
  success handler before navigation:

  ```tsx
  <Form
    defaultValues={defaultValues}
    onSuccess={(_result, _variables, { form }) => {
      form.reset(defaultValues);
      router.push("/issues");
    }}
    // ...
  />
  ```

- Do not add a navigation cleanup that resets every form. An unfinished form is a draft and should
  survive Activity navigation unless the product deliberately defines a different boundary.
- Step flows should give each field-bearing step its own form. Moving between steps may hide that form;
  returning to the step should restore its in-progress values.

### Route-Owned Page Metadata

Old APIs:

- `createMetadataLoader(load)` from `@kenstack/admin/queries` generated a route's metadata callback.
- Sites also commonly exported one-use `loadXPageMetadata(...)` query helpers and re-exported them from
  route files as `generateMetadata`.

New pattern:

- The Next.js route file declares `generateMetadata` directly and calls the same detail loader as the
  page. A cached detail loader using `resolveVisiblePage(...)` already owns Draft Mode, authorization,
  current visibility, and caching.
- `createMetadataLoader` is removed. Query modules export reusable data reads, not wrappers around a
  framework callback that Next.js discovers only from a route file.

Migration steps:

- First migrate the detail loader to the cached-row and `resolveVisiblePage(...)` pattern below so the
  caller no longer needs to read Draft Mode.
- Replace `createMetadataLoader(loadXPage)` or a `loadXPageMetadata` re-export with a direct route
  callback:

  ```ts
  import { buildMetadata } from "@kenstack/admin/metadata";

  import { loadArticlePage } from "@/modules/articles/queries/page";

  export async function generateMetadata({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }) {
    const { slug } = await params;
    return buildMetadata(await loadArticlePage(slug));
  }
  ```

- Keep custom title, image, description, and robots mapping directly in the route callback when the
  standard builder does not express it.
- Remove the one-use metadata query wrapper, its barrel export, and imports of
  `@kenstack/admin/queries` that existed only for `createMetadataLoader`. The `@kenstack/admin/queries`
  entry is removed; import `selectFields` from `@kenstack/records/select`.

### Shared Database Query Entry

Old APIs:

- Site query code imported `listWhere(...)` and `pageWhere(...)` from
  `@kenstack/admin/queries`.
- Media selectors and their result types were exported with schema objects from
  `@kenstack/db/tables` or `@kenstack/db/tables/media`.

New API:

- `@kenstack/db/queries` is the single public entry for reusable site-side database read helpers. It
  exports `listQuery`, `resolveListDraft`, `pageQuery`, `resolveVisiblePage`,
  `selectMedia`, `selectMediaSubquery`, `selectImageSubquery`, and the related public types.
- `@kenstack/db/tables` owns schema objects and table builders only.

Migration steps:

- Migrate standard publication lists from `listWhere` to `listQuery`. Migrate page reads from
  `pageWhere` and direct active-row predicates to `pageQuery`.
- Replace imports of media selectors, `MediaVariantName`, `SelectedMedia`, and `SelectedImage` from
  `@kenstack/db/tables` or `@kenstack/db/tables/media` with `@kenstack/db/queries`. Keep actual table
  imports such as `media` and `tags` under `@kenstack/db/tables`.

### Cached Detail Page Visibility

Old pattern:

- Cached detail loaders applied `pageWhere(...)` inside their database query. A request for a scheduled
  slug could therefore cache `null` before publication. The list and detail caches then refreshed on
  independent lifetimes, allowing the published list to expose a link whose detail route still returned 404.
- Draft reads commonly bypassed the public cache and repeated the content query.
- SEO-capable page loaders spread `metaSelect(table)` into their selection separately from the table's
  `seo: true` configuration.

New pattern:

- `await resolveVisiblePage(row)` from `@kenstack/db/queries` owns the complete request-time gate and
  returns the same row or `null`. It detects Draft Mode and requires an admin when enabled. For public
  requests it owns the current date, includes unlisted records, excludes drafts, and returns published
  records when `publishedAt <= now`.
- A detail loader uses `pageQuery(...)` to cache one active row by its stable route key without a
  time-dependent publication predicate. The helper includes `visibility` and `publishedAt`; when the
  table has `seo: true`, it also includes `seoTitle`, `seoDescription`, and the resolved `ogImage`. The
  cache uses the ordinary record tags and may use `cacheLife("max")`. Both public and authorized draft
  requests reuse that row.

Migration steps:

- Change the cached row query to `pageQuery(...)`. Pass the page-specific fields through `select` and
  its stable identity predicate through `where`; do not repeat deletion, publication, or configured SEO
  selection.
- Remove `metaSelect(...)` imports and spreads. `pageQuery(...)` derives that selection from the table.
- Return `resolveVisiblePage(await loadCachedRow(slug))` directly when the exported loader does not
  transform the result. Put the database query in `loadCachedRow`; keep a separate uncached query helper
  only when another production path also calls it. Remove separate caller-owned Draft Mode, date,
  authorization, and null checks; do not put them inside the cached function. Pass `{ draft: false }`
  only when a current caller deliberately requires public visibility during a Draft Mode request. The
  helper performs Draft Mode authorization even when the row is missing and propagates the row or `null`
  to the caller.
- Do not pass `new Date()` or add `io()`. The helper owns the clock, and the awaited row read is
  already the request-time suspension point.
- Change the row cache to `cacheLife("max")` and retain all record and dependency tags. Creation,
  edits, deletion, slug changes, and rescheduling still require tag invalidation; the request-time gate
  alone owns the passage of publication time.
- For uncached direct public-record checks, call `pageQuery(...)` and then
  `resolveVisiblePage(..., { draft: false })`.

### Scheduled Publication Lists

Old pattern:

- Callers selected list rows themselves and separately called
  `loadPublicationCacheLife(table, { where? })`. Draft Mode was passed through caller components, and
  public and draft branches could duplicate or drift from the same query.

New API:

- `resolveListDraft()` from `@kenstack/db/queries` reads Draft Mode and requires an admin when it is
  enabled. Pass the returned serializable boolean into the cached function.
- `listQuery(table, { draft, select, joins?, where?, orderBy?, limit? })` owns both the standard list
  query and its earliest-future-publication query, using one publication time for both. It returns
  `[rows, publicationCacheLife]`; the second value is `undefined` when no scheduled publication can
  change that list.

Migration steps:

- Make the exported loader call `resolveListDraft()` and pass its result plus the loader's
  serializable options into one private `"use cache: remote"` function. Remove Draft Mode reads and
  `draft` arguments from components and other callers. Next.js reexecutes cached functions and does not
  save their results during Draft Mode, so the private function can serve both visibility modes.
- For a list that must remain public during Draft Mode, pass `draft: false` directly and keep a
  single cached loader. Purchase options and other public choice lists must not change because an admin
  has a preview cookie; validate submitted choices against authoritative uncached state.
- In the cached function, call `listQuery(...)`, then call
  `cacheLife(publicationCacheLife ?? "max")`. Keep the module's ordinary cache tags; scheduled expiry
  does not replace invalidation for edits, deletions, or newly scheduled records.
- For a bounded filtered variant, construct one SQL predicate inside the cached function from its
  serializable arguments and pass it once as `where`. Remove one-use predicate wrappers. The helper
  applies the predicate to both queries and applies publication visibility before row limits.
- Remove imports and calls to `loadPublicationCacheLife(...)`; it is no longer a public helper.
- Use `joins` for the `innerJoin(...)` calls required by `where`. The helper applies those joins to both
  queries. Keep `select`, `where`, `orderBy`, and `limit` in their named options; `joins` is not a general
  query callback. The relationship must preserve one result row per listed record, and joined table
  schedules require their own cache-lifetime treatment.
- Do not apply this migration mechanically to live availability, inventory, transactional decisions,
  or queries whose result also crosses other time boundaries. Those reads keep an uncached or
  deliberately shorter policy unless all of their transitions are represented by the cache lifetime.
- Do not apply it to detail loaders. Use the max-cached row and request-time `resolveVisiblePage`
  pattern above so a published list and its linked detail route cross the publication boundary together.

### Notice Component Naming

Old API:

- The general status-message component was `Alert` from `@kenstack/components/Alert`, with props
  exported as `AlertProps`. Despite that name, it also displayed success and informational messages and
  supplied no alert semantics unless the caller added them.

New API:

- The component is `Notice` from `@kenstack/components/Notice`, with props exported as `NoticeProps`.
  Callers add `role="alert"` only when a message requires alert semantics.
- `AlertDialog` and the form-specific `@kenstack/forms/Notice` API are unchanged.

Migration steps:

- Replace `@kenstack/components/Alert` imports and `Alert` JSX with
  `@kenstack/components/Notice` and `Notice`.
- Replace `AlertProps` imports with `NoticeProps`.

### Explicit Unattributed Audit Actors

Old API:

- `logger.audit(...)` accepted `isSystem: true` to prevent attribution to the current user, and audit
  storage persisted that classification in `audit_logs.is_system`.

New API:

- `audit(...)` from `@kenstack/logger` represents audit attribution directly: omit `userId` to resolve
  the current user, pass a numeric ID to attribute an explicit user, or pass `null` to record an
  intentionally unattributed action.
- `isSystem` and the `audit_logs.is_system` column are removed. The former callers represented
  user-initiated requests without a proven actor rather than system-initiated activity.

Migration steps:

- Replace `isSystem: true` with `userId: null` for intentionally unattributed actions, and remove
  `isSystem: false` where current-user attribution should continue to be inferred.
- Generate and commit an append-only migration that drops `audit_logs.is_system`.

### Verification Core And Email Login

Old APIs:

- `sendPasswordResetPipeline(...)` and `sendPasswordResetAction(...)` from
  `@kenstack/auth/handlers/sendPasswordReset` created an administrator-triggered password-reset token
  and email. The default auth pipeline exposed that operation as `"send-password-reset"`.

New APIs:

- The proof operations are imported from their server-only
  `@kenstack/auth/email/verification/sendCode` and
  `@kenstack/auth/email/verification/verifyCode` owners. Aggregate browser state comes from
  `@kenstack/auth/server/state`; proof-to-session login comes from
  `@kenstack/auth/email/login/redeemProof`. Host actions call these operations explicitly in their own linear
  workflow, while verification itself neither creates accounts nor establishes sessions. `verifyCode`
  returns the proven state or throws; callers do not re-check it.
  The Login form redeems email links with a POST, then classifies them as invalid, expired, wrong-browser,
  or proven before the email-login handler continues. Expired and invalid links return to email login
  with a recovery notice. A link is bound to the browser cookie created when the email was requested, so
  opening it in another browser does not consume it or establish a session.
- The host database schema registry exports `verifications` from
  `@kenstack/db/tables/verification`; unlike `quotaUses`, it is not re-exported by
  `@kenstack/db/tables`, so the host registry adds
  `export * from "@kenstack/db/tables/verification"` itself.
  Verification uses one shared HttpOnly browser
  cookie and is not scoped to a host workflow. `verifications` stores provisional email proof only;
  authenticated users and their login lifetime remain exclusively in the ordinary `sessions` table.
- The auth pipeline provides password sign-in, email sign-in, onboarding, and password recovery as one
  supported account system. `authPipeline({ emailLogin })` accepts email-login copy overrides. Emailed
  links land on the ordinary `/login` page;
  `LoginForm` detects the token and submits it to the auth pipeline. Route handlers no longer render
  HTML. `LoginForm` owns the password/email method choice itself.
- Forgotten-password delivery uses the same verification-link proof as email login, with
  `returnTo=/reset-password` and the existing recovery email copy. It preserves the neutral public
  response for missing accounts and delivery failures. The reset-password page is authenticated-only:
  any recent non-impersonated authentication can set a password without the current password, while an
  older session must still supply it. The separate `password_reset_requests` table and token-bearing
  reset page are removed.
- `hasRecentAuthentication(...)` replaces `hasRecentPasswordAuthentication(...)`. A recent
  non-impersonated session now satisfies the password-change gate regardless of whether it began with a
  password or email.
- The `@app/email` binding exports `loadEmailFrom`, which transactional senders use to resolve the
  from-address.
- `createLoginStep(...)` from `@kenstack/auth/components/Login/Step` adapts email and password login to
  StepFlow. Emailed links return to the flow page and advance the login step after verification.

Migration steps:

- Re-export `verifications` from `@kenstack/db/tables/verification` with the host table
  registry, and generate the append-only host migration creating the table.
- Export `POST` from the host auth route —
  `export const { POST } = authPipeline({ emailLogin })`.
  The login page renders `<LoginForm />` unchanged; emailed links now land there instead of on the API
  route. Remove email-login `confirmation` overrides, which no longer have a separate presentation
  surface.
- `sendCode({ email, linkPath, request }, createVerificationEmail(copy))` owns challenge policy,
  request/IP quotas, delivery, and cleanup of undelivered challenges. The host callback owns only the
  subject and rendered email design. `verifyCode` and the Login form's link action produce the same
  proven browser state. `loadAuthState` includes the active user's normalized email, roles, and user ID
  and is React-cached for duplicate reads in one request; mutators call `loadFreshAuthState` instead.
- `verifyCode` returns the proven email and verification ID captured inside its transaction. It does
  not reread aggregate auth state after committing: a concurrent request may legitimately supersede or
  consume that proof, and must not turn the already-recorded success into a server error. Pass that
  proven value to `redeemEmailProof(...)`; a handler that may establish a session performs one final fresh
  public-auth read for its response.
- Codes and links expire after 15 minutes. Successful proof starts a separate one-hour browser window
  for site-owned account creation or authentication. Logout clears that verification cookie. Expired
  verification rows remain available for older-code diagnostics for 24 hours, then `sendCode`'s sampled
  cleanup removes them. Every successful delivery adds a verification row; the newest row sharing the
  browser verification-key hash is current, while earlier rows retain the prior codes and links. The
  raw browser key remains only in the HttpOnly cookie.
- An impersonated session remains `authenticated` and carries `impersonatedBy`. Verification, account
  creation, and proof-to-session authentication refuse to act through it. A signed-in user may refresh
  only their own session with a proof for the same email.
- Email login sends the same challenge whether an account already exists. After proof, an existing
  account is authenticated and an unknown address reports the missing account by default. A host with
  an account-creation flow may enable `emailLogin.allowUnregistered`; the auth pipeline then preserves
  the proven state until the host creates the account and passes that proof to `redeemEmailProof(...)`.
- Generate an append-only migration for `verifications`. Host workflows should not reference
  verification rows: use `createLoginStep(...)` in StepFlow, protect authenticated server boundaries
  with `requireUser`, and keep workflow expiry independent of the shared verification proof.
- Remove `resetPasswordPageRouteOptions` and the token prop from reset-password pages. Render
  `<ResetPasswordForm />` on the authenticated page, and generate an append-only migration dropping
  `password_reset_requests`.
- Replace administrator calls to the `"send-password-reset"` action with `"send-onboarding"`. The
  built-in users editor now sends an onboarding email that links to `/login` with the account email
  filled in; the user authenticates through the configured email-login flow before setting a password.
- Replace custom imports of `sendPasswordResetPipeline(...)` or `sendPasswordResetAction(...)` with
  `sendOnboardingEmailAction` from `@kenstack/auth/handlers/sendOnboarding` when the workflow is an
  administrator inviting an existing user. Self-service recovery remains the `"forgot-password"`
  action configured through `authPipeline({ forgotPassword })`.
- Replace `hasRecentPasswordAuthentication(...)` imports and calls with
  `hasRecentAuthentication(...)`. Callers no longer need a password-provider check; every recent
  non-impersonated session follows the same password-change policy.

### Nameless-Account Avatars

Old API:

- `formatUserInitials(...)` accepted an `email` input and fell back to the email's first two letters,
  then to a `fallback` defaulting to empty text. `Avatar` with empty initials rendered an empty
  colored circle.

New API:

- `formatUserInitials(...)` derives initials from names only; two letters of an email were noise and
  the input is removed. The `fallback` default remains empty text.
- `Avatar` owns the empty state: with no image and no initials it renders a muted circle with a
  person silhouette, so nameless accounts read as "account without a name" everywhere (header menu,
  admin lists, form placeholders) instead of fabricated letters.
- The users table's `given_name` and `family_name` columns default to empty text, matching
  `middle_name`, so an account can exist before its holder supplies a name.

Migration steps:

- Remove `email` from `formatUserInitials(...)` call sites; rely on `Avatar`'s silhouette for
  nameless users, or pass an explicit `fallback` where different presentation is required.
- Generate the append-only host migration that sets `DEFAULT ''` on `users.given_name` and
  `users.family_name`.

### Login Component Entry

Old API:

- `@kenstack/auth/components/Login` was a Client Component module exporting `LoginForm` both as the
  default and as a named export.

New API:

- `@kenstack/auth/components/Login` is a Server Component (default export only). It resolves the
  remembered-method cookie and active challenge from `loadAuthState()` inside its own Suspense
  boundary.

Migration steps:

- Replace named imports of `LoginForm` with the default import.
- Move standalone login rendering out of Client Components and import the default Server Component.
- A StepFlow uses `createLoginStep(...)` from
  `@kenstack/auth/components/Login/Step`, which owns its embedded behavior.

### Object Roles Registry With Login-Provider Bestowal

Old APIs:

- `@app/deps/roles` (and the default `@kenstack/deps/roles`) exported an array of checkbox options
  satisfying `CheckboxListOptions`, with `Role` derived from the entries' `value`.
- `createDeps({ roles })` accepted a readonly role-name array; the exported `defaultRoles = ["admin"]`
  supplied the default value and the `TRoles` generic default.
- `User<TRoles extends readonly string[]>` typed `roles` as `TRoles[number][]`.
- Sessions bestowed every stored role regardless of login method, and `login(userId)` always recorded
  `provider: "password"`.

New APIs:

- The registry is an object keyed by role name:
  `{ admin: { label: "Administrator" } } as const satisfies Record<string, { label: string }>`.
  Kenstack derives its role type directly from `@app/roles`.
- `@app/roles` is the one site-wide role registry. `createDeps({ roles })`, its role-registry
  generic, and `defaultRoles` are removed.
- `User<TRole extends string = string>` types `roles` as `TRole[]`.
- Session resolution filters stored roles to registered ones: an unregistered value grants nothing.
  Sign-in methods are equal — every enabled method bestows every registered role; a planned separate
  second-factor gate in front of admin (an additional factor of any kind) is the future privilege
  boundary. `login(userId, provider = "password")` records the actual provider, and the
  `login_provider` enum gains `email`.

Migration steps:

- Move the host role registry to `src/roles.ts` and reshape it to an
  `as const satisfies Record<string, { label: string }>` object registry.
- Derive checkbox options once as a constant from `Object.entries(roles)` instead of passing the
  registry to `checkboxListField` directly.
- Remove `roles` from `createDeps(...)` and remove `defaultRoles` imports.
- Replace `User<typeof roles>` with `User<keyof typeof roles>` (or `User` for the untyped default).
- Generate the append-only `ALTER TYPE "login_provider" ADD VALUE 'email'` host migration.

### Input Adornments

Old API:

- `@kenstack/forms/UrlField` accepted an `icon` prop for content at the start of the input.
- Other controls built on `@kenstack/forms/controls/Input` had no shared API for content before or after the input value.

New API:

- `Input`, `InputField`, `SlugField`, and `UrlField` accept direction-aware `startAdornment` and `endAdornment` props.
- `UrlField` supplies its default globe through `startAdornment`. Generated URL fields also accept both adornment props at the render site.

Migration steps:

- Replace `<UrlField icon={...} />` with `<UrlField startAdornment={...} />`.
- Use `endAdornment` for content that belongs after the input value.

### Markdown Theme Styles

Old behavior:

- Markdown renderers depended on each caller to add the `markdown` class and each host to provide its own baseline typography. Hosts commonly copied the same paragraph spacing, heading, list, link, and blockquote rules.

New behavior:

- `@kenstack/components/Markdown`, `@kenstack/components/Markdown/Client`, and page-editor `MarkdownEdit` add the `markdown` class automatically.
- `@kenstack/components/markdown.css` provides opt-in baseline styles for rendered Markdown and Milkdown editors. Link colour uses the active theme's `--primary` token.
- `@kenstack/admin/theme.css` loads the Markdown defaults for admin and page-editor surfaces.

Migration steps:

- Import `@kenstack/components/markdown.css` from the public theme entry point or layout before host-specific theme overrides.
- Remove copied baseline `.markdown` and `.milkdown` rules. Keep host-specific typography or colour overrides when they express a real site design.
- Remove explicit `markdown` classes passed only to identify a Kenstack Markdown renderer; the components now supply that class.

### Shared Component Theme Styles

Old behavior:

- Account-menu links and actions carried duplicated Tailwind classes, and host navigation had to restate or override those classes to make equivalent links and buttons look alike.
- Kenstack's reusable button presentation was bundled under the admin theme even though `Button` and `LinkButton` are shared components.

New behavior:

- Kenstack menu links and actions carry the semantic `.menu-item` class.
- `@kenstack/components/menu-item.css` provides optional baseline presentation for `.menu-item` and `.menu-heading`.
- `@kenstack/components/button.css` provides the shared `.button` variant, size, interaction, and accessibility defaults used by both `Button` and `LinkButton`. Its colour and radius values use the standard theme tokens with usable fallbacks. Its Tailwind `link` utility is the single text-link recipe; the emitted `.link` class applies that recipe, and `.button.link` adds native-button geometry and state handling.
- `Button` and `LinkButton` apply the same variant and size contract. Their `link` variant emits `.button.link` and the selected size; use `.link` directly on a native `<a>` or `<button>` when it should have ordinary text-link geometry instead of button mechanics.
- Text links, link-variant buttons, rendered Markdown links, and menu items use `--link-underline-offset`, with a common fallback.
- `@kenstack/theme.css` loads Kenstack's complete shared theme, while each constituent stylesheet remains available through its component path for selective use.
- The aggregate theme is an import-and-extend foundation. Shared styles own component mechanics and interaction defaults; a later host theme keeps control of its intentional visual decisions without repeating accepted Kenstack declarations.
- `@kenstack/admin/style-guide/StyleGuide` renders the real shared components for a host-provided development style-guide route. Hosts can isolate the same examples under base, admin, and site stylesheet stacks for direct comparison.
- `@kenstack/admin/theme.css` loads the baseline automatically for admin surfaces.
- Account-menu containers carry `.account-menu`, and mobile-navigation panels expose `data-slot="mobile-nav"`, for contextual theme rules.

Migration steps:

- Site themes may import all shared Kenstack styles with `@kenstack/theme.css`, import individual stylesheets such as `@kenstack/components/button.css` or `@kenstack/components/menu-item.css`, or define either contract entirely at the site level.
- Load site-specific button rules after the Kenstack import to override the defaults for that surface.
- When extending the shared button styles, remove host declarations that only repeat Kenstack's structure, interaction, disabled, focus, or icon mechanics. Retain the dimensions, typography, colours, borders, motion, and host-only variants that form the host's visual contract.
- When replacing the button contract completely, omit `@kenstack/components/button.css` by importing only the required theme leaves. The host then owns `.button`, `.link`, every variant and size, and all interaction and accessibility states.
- In a host stylesheet that loads or references the Kenstack theme, use `@apply link` on the anchor scope that owns ordinary site links. This keeps those links and `.button.link` themed together without changing navigation, logo, or other contextual anchors globally.
- Use `.menu-heading` for a label or signed-in identity that heads a group of menu items.
- Replace duplicated link and button presentation classes with `.menu-item`; retain contextual rules only where a menu genuinely differs, such as `.account-menu .menu-item` or `[data-slot="mobile-nav"] .menu-item`.
- Render the style guide through an authenticated, development-only host route that renders `@kenstack/admin/style-guide/StyleGuide` through the application's Tailwind pipeline.

### Automatic Form Alerts

Old API:

- Forms rendered `<Notice />` manually where mutation status messages should appear. Forms that omitted
  it had no outlet for request errors, form-level validation errors, or errors belonging to fields that
  were not rendered.

New API:

- `@kenstack/forms/Form` renders its alert outlet automatically before the supplied form children. It
  displays mutation status, pathless schema and server errors, and errors for unrendered fields. Field
  controls continue to display their own errors inline.
- `Form` accepts `validationMessage` when a workflow needs more specific introductory copy. It preserves
  every distinct client or server message for a field rather than showing only the first one.

Migration steps:

- Remove explicit `@kenstack/forms/Notice` imports and `<Notice />` children from forms to avoid rendering
  the same status twice.

### Nonnegative Spin Button Default

Old behavior:

- `SpinButton` had no default minimum. Omitting `min` allowed negative values and kept the decrement
  action available below zero.

New behavior:

- Omitting `min` sets the minimum to zero. The input, decrement action, and value clamping all enforce
  that default.

Migration steps:

- Pass an explicit negative `min` appropriate to the domain when a spin button accepts signed values.
- Leave `min` omitted only when zero is the intended lower bound.

### Per-Kind Field Configuration

Old API:

- `FieldDefinition` declared `checked`, `unchecked`, and `options` for every field, so every factory
  accepted `checked` and `unchecked` regardless of kind, and `kind: "custom"` was rejected as a
  reserved legacy kind.

New API:

- `FieldDefinition` carries only the shared admin surface. A base definition declares its own
  configurable keys by spreading `configurable<...>(...editorProperties)` from `@kenstack/fields`.
  The named properties are captured as definition-owned editor props; configurable keys omitted from
  that argument remain available to server and record infrastructure without reaching the editor.
  For example, upload fields forward `accept` but not server-only size policy, while checkbox and
  toggle fields forward their configured checked values. Factories reject keys their base does not
  declare, and generated components do not allow definition-owned editor props to be overridden.
- `checkboxField(...)` and `toggleField(...)` no longer accept `options`. String-valued checked
  fields derive their enum-filter choices from the two declared values, labeled with `startCase`;
  remove any explicit `options` from checked field configurations. Custom `field(...)` definitions
  may carry extra keys; spread `configurable<...>(...editorProperties)` into a concrete definition
  when those keys should be captured for its registered editor.
- Other fields with `filterKind: "enum"` or `"includes"` still provide filter choices through
  `options`.
- The `"custom"` kind is no longer specially rejected; it behaves like any other kind and fails only
  if no component or behavior is registered for it.
- `defineFormFields(...)` does not throw for a kind without a registered client component; it omits the
  unresolved field because a module's own `EditForm` may render it through a bespoke panel.
  `defineClient(...)` receives the bare field definitions and performs no component resolution.
  Relation forms pass the field subset they render and their `prefix` directly to
  `defineFormFields(...)`. Settings follow the same model: their supplied `SettingsForm` decides which
  generated or bespoke controls to render.
- Generated form-field components no longer accept render-site `label` or `description` overrides.
  Configure that copy on the field definition; when no label is configured, the generated component
  derives one from the field name.
- The intermediate `DerivedFields`, `ResolvedClientFieldSetFrom`, `ResolvedClientFieldsFrom`,
  `StitchedField`, and `StitchedFields` exports are removed. Use `FormFields<TFields>` from
  `@kenstack/fields/formFields` when a component needs the generated map's public type.
- `checkboxField(...)` and `toggleField(...)` with `filter: true` require string or boolean value
  pairs; other pairs are a type error and throw at definition time. Boolean pairs filter as boolean
  filters; string pairs filter as enum filters with derived choices.
- `relationshipField({ mode: "single" })` defines a scalar foreign-key selector with a `number | null`
  base schema. The field name must map to one direct single-column foreign key whose target `id` belongs
  to exactly one registered admin-list module; Kenstack validates that registry contract and derives the
  option query from the target module. Existing `relationshipField()` definitions remain many-to-many.

### Field Library Organization

Old APIs:

- Whole-record helpers were exported from `@kenstack/fields/records` and record selection from
  `@kenstack/fields/select`.
- Address data and schemas were exported from `@kenstack/fields/supportedCountries` and
  `@kenstack/fields/countryRegionSchemas`.
- Field contracts were imported from `@kenstack/fields/types`.
- Relationship builders and contracts were imported from `@kenstack/fields/relationships`.
- Shared field validation schemas were imported from `@kenstack/zod/*`.

New APIs:

- Whole-record helpers are exported from `@kenstack/records`; direct save and selection imports use
  `@kenstack/records/save` and `@kenstack/records/select`.
- Address data is exported from `@kenstack/fields/address/countries`; address schemas are exported from
  `@kenstack/fields/address`.
- Isomorphic field contracts including `FieldKind`, `FieldOption`, and `FieldOptions` are exported from
  `@kenstack/fields`; `DefinedField` and `DefinedFields` are exported from
  `@kenstack/admin/fields`; `FieldComponentProps` is exported from
  `@kenstack/fields/formFields`.
- Relationship builders and contracts are exported from
  `@kenstack/fields/relationship/relationships`. Infer a relationship map from
  `defineRelationships(...)`; the broad `Relationships` alias has been removed.
- Field schemas are exported by their owners: `@kenstack/fields/email`, `phone`, `file`, `image`,
  `mediaList`, `tags`, and `unsecureId`. Password validation is authentication policy and is exported
  from `@kenstack/auth/schemas/password`.
- Simple reusable field definitions live in `fields/index.ts`; a field has a per-field directory only when
  it owns additional colocated files. `@kenstack/fields` is the isomorphic definition entry point, and
  `@kenstack/fields/server` remains the server-only entry point.
- `numberField()` now uses `null` as its empty default and normalizes an empty string to `null`. It is
  optional by default; a consuming field that requires a number supplies a non-nullable `zod` override.

Migration steps:

- Apply these record and field-owner path replacements:
  - `@kenstack/fields/records` → `@kenstack/records`
  - `@kenstack/fields/records/loadRecord` → `@kenstack/records/load`
  - `@kenstack/fields/records/saveRecord` → `@kenstack/records/save`
  - `@kenstack/fields/select` → `@kenstack/records/select`
  - `@kenstack/fields/supportedCountries` → `@kenstack/fields/address/countries`
  - `@kenstack/fields/countryRegionSchemas` → `@kenstack/fields/address`
  - `@kenstack/fields/relationships` → `@kenstack/fields/relationship/relationships`
  - `@kenstack/fields/relationshipSchema` → `@kenstack/fields/relationship`
- Replace exports from `@kenstack/fields/types` by name:
  - `FieldKind`, `FieldOption`, `FieldOptions`, `FieldInputOption`, and `MediaUploadOptions` →
    `@kenstack/fields`
  - `DefinedField` and `DefinedFields` → `@kenstack/admin/fields`
  - `DefaultValuesFromFields` → `@kenstack/fields/createDefaultValues`
  - `FieldComponentProps` → `@kenstack/fields/formFields`
  - `FieldComponent` was removed; type custom editors with `FieldComponentProps` at their declaration.
  - `MediaListUploadOptions` → `MediaUploadOptions` from `@kenstack/fields`
  - `FieldDisplay`, `FieldDisplayContext`, and `FieldComponentLoader` were removed.
- Replace `@kenstack/fields/client` imports with `@kenstack/fields`.
- Replace `createZodSchema` from `@kenstack/fields/createZodSchema` with
  `createSchemaFromFields` from `@kenstack/fields/createSchemaFromFields`.
- Replace each `@kenstack/zod/<field>` import with `@kenstack/fields/<field>`. The old
  `@kenstack/zod` aggregate's `imageSchema` and `phone` exports move to
  `@kenstack/fields/image` and `@kenstack/fields/phone`. Replace `@kenstack/zod/password` with
  `@kenstack/auth/schemas/password`.
- Move `getDisplayValues` imports from `@kenstack/fields/display` to
  `@kenstack/admin/pageEditor/display`. Generic field display callbacks were removed; keep display
  behavior with its owning consumer.
- Move page-editor types from `@kenstack/admin/pageEditor/types`:
  - `BlockTag`, `PageEditorProps`, and `EditorWrapperProps` →
    `@kenstack/admin/pageEditor/wrapper`
  - `ComponentProps` → `PageEditorContentProps` from `@kenstack/admin/pageEditor/wrapper`
  - `PageEditorAdminProps` → `@kenstack/admin/pageEditor/wrapper/makeEditorWrapper`
  - `Name` → `PageEditorFieldName` from `@kenstack/admin/pageEditor/fields`
  - `PageEditorLoader` was removed.
- Move direct server-kind imports:
  - `@kenstack/fields/server/date` → `@kenstack/fields/date/server`
  - `@kenstack/fields/server/dateTime` → `@kenstack/fields/dateTime/server`
  - `@kenstack/fields/server/file` → `@kenstack/fields/file/server`
  - `@kenstack/fields/server/image` → `@kenstack/fields/image/server`
  - `@kenstack/fields/server/mediaList` → `@kenstack/fields/mediaList/server`
  - `@kenstack/fields/server/relationship` → `@kenstack/fields/relationship/server`
  - `@kenstack/fields/server/tags` → `@kenstack/fields/tags/server`
  - The old boolean, checkbox-list, radio-button, and text server subpaths were removed because those
    kinds no longer own server behavior.
- Register removed field component loaders by property with
  `defineFormFields(fields, { components: { propertyName: Component } })`.
- Review `numberField()` consumers that previously relied on the implicit zero default. Supply an
  explicit default only when zero is the domain default, and supply a non-nullable schema when the field
  is required.
- Do not import a field component or server implementation through `@kenstack/fields`; use the kind's
  explicit `Component` or `server` subpath when direct access is required.

### Resolved Client Fields

Old APIs:

- Module clients assembled and exported a second resolved field registry before calling
  `defineClient(...)`.
- `Field` from `@kenstack/admin/forms` accepted a runtime `name` and the combined prop surface of every
  supported field kind.

New APIs:

- A module generates its form components with `defineFormFields(fields, { components?, prefix? })` from
  `@kenstack/fields/formFields`. Keep a one-use generated map in its consuming form; extract a
  module-owned `fields/formFields.ts` only when multiple consumers need the same configured map. Custom
  components go in the property-keyed `components` map. The returned map holds fixed-name components
  such as `<fields.title />`, and they read form state through the standard form context.
- `defineClient(...)` takes the bare isomorphic definitions as `admin.fields` for the record schema,
  list typing, and one-to-one relation metadata. It rejects component-bearing fields and no longer
  accepts `fieldKinds` or `fieldComponents`. `AdminEditFormProps` is removed: module edit forms take no
  `fields` prop.
- The `prefix` option produces relation paths such as `movie.releaseYear` without rebuilding those
  paths in the panel. `FieldComponentProps` and `FormFields<TFields>` are exported from
  `@kenstack/fields/formFields`.
- One-to-one edit forms receive bare relation `fields` and `prefix` alongside `ParentEditForm`. The
  relation form resolves the controls it owns; a panel that creates a second consumer of a parent's
  generated map imports the shared map instead of receiving a `parentFields` prop.

Migration steps:

- Remove intermediate resolved field maps. Call
  `defineFormFields(definitions, { components?, prefix? })` in a sole consuming form or a shared
  `fields/formFields.ts`, pass the bare definitions as `admin.fields` in `defineClient(...)`, and remove
  the `fieldKinds` and `fieldComponents` arguments from `defineClient(...)`. The client entry never
  imports generated form maps.
- Replace `<Field name="title" />` with a generated component such as `<fields.title />`. Remove the
  `fields` prop and `AdminEditFormProps` typing from module edit forms and their section components;
  remove `name` and move field identity and static configuration into the definition.
- Update one-to-one edit forms to consume their supplied bare relation map and resolve their controls in
  the relation form before generating them with the supplied prefix. Pass the prefix or full names into
  bespoke controls instead of embedding relation paths. Replace `parentFields` reads with imports from
  the parent's shared generated map when that additional consumer earns one.
- Pass that generated field map to shared admin layouts that render named fields. `MetaFields` now
  requires it explicitly:

  ```tsx
  import MetaFields from "@kenstack/admin/components/MetaFields";

  <MetaFields formFields={fields} />;
  ```

- Keep the low-level `Field` from `@kenstack/forms/Field` for implementing controls. Only the high-level
  admin name resolver was removed.

### Mail Delivery Results

Old API:

- `@kenstack/lib/mailer` returned the SES response on success and `false` or `undefined` on provider failure.

New API:

- The mailer returns a discriminated result with `status: "sent"`, `status: "recipient-rejected"`, or `status: "operational-failure"`.
- Operational failures include only sanitized provider diagnostics: the provider code, HTTP status when available, and attempt count. They never include recipient addresses or raw provider messages.
- The mailer contains failures that occur before the provider request as operational failures with zero
  attempts, so callers do not add a separate mailer exception-reporting path.

Migration steps:

- Replace truthiness checks with a `result.status` check.
- Treat `recipient-rejected` as expected customer input. It is limited to an
  `InvalidParameterValue` response that explicitly identifies the recipient;
  general SES `MessageRejected` responses remain operational because they can
  represent sender, account, or policy failures. The mailer writes sanitized
  `operational-failure` details through `errorLog(...)`; callers must not route
  mail delivery failures through the email-backed `reportError(...)` reporter.

Before renaming a committed shared or exported type, inspect every consumer and require the old name to be
materially misleading about the public contract. Compile Kenstack and a representative host, and document
the downstream migration when the rename proceeds.

### Module Field Implementations

Old API:

- Modules attached server behavior by field property name through `serverFields(...)`,
  `admin.behaviors`, or relation-level `behaviors`.
- `@kenstack/fields/server` exported intermediate pipeline types including `FieldBehavior`,
  `ServerDefinedFields`, `ServerDefinedFieldsFrom`, and `ServerBehaviors`.

New API:

- `admin.fields` accepts the `defineFields(...)` field map directly; `defineModule(...)` resolves
  server defaults itself.
- Module server behavior targets a field property through `admin.fieldServers`. One-to-one relation
  behavior uses the same property-keyed `fieldServers` shape beside that relation's table binding.
- A module client passes the isomorphic field map directly to `defineClient(...)`. A separate
  consumer-owned `defineFormFields(...)` call supplies custom editor components through the
  property-keyed `components` option. Extract it to `fields/formFields.ts` only when the configured map
  is shared. Unknown registrations throw; a field without a component remains available for a bespoke
  panel and is omitted from the generated component map.
- Standard field kinds keep their built-in server behavior and client editor when the module does not
  register an override. Module-specific fields use a descriptive custom kind such as
  `event-occurrences`.
- Field definitions no longer carry component loaders. Standard list filters retain the serializable
  `filterKind` capability. Loaded-value types now come from registered server-selection and client
  component contracts; register the server implementation by kind and the client component by property
  when replacing a standard kind with a semantic kind. The page editor owns its supported inline field
  set.
- `resolveServerFields(...)` remains available for lower-level field-map resolution, with the same
  registration options contract. It resolves an isomorphic field map once; do not pass its resolved
  output into another resolution call.
- The caller-facing server type surface includes `ServerField`, `ServerFieldKinds`,
  `ServerFieldResolver`, `ServerFieldResolverFor`, `SelectedServerFieldResolverFor`, and the field
  lifecycle context, result, task, and upload types. Resolved-map intermediates remain internal.

Migration steps:

- Pass the isomorphic field map directly as `admin.fields`.
- Assemble server registrations at the module entry boundary through property-keyed `fieldServers` in
  `index.ts`, and assemble property-specific client components in their consuming form or a shared
  `fields/formFields.ts`. Keep an implementation in its owning `fields/<name>/server.ts` or
  `Component.tsx`, but remove assembly-only `fields/server.ts` and `fields/client.tsx` files.
- Move relation registrations into the owning kind's local `defineOneToOne(...)` server config beside
  its relation table.
- Remove `component` from isomorphic field definitions. Register generic editors through
  `defineFormFields(...)`; keep bespoke, context-dependent editors in the module form. Import the
  generated fixed-name components there for JSX such as `<fields.title />`.
- Replace `serverFields(...)` with `resolveServerFields(...)` only where a resolved field map is
  needed outside `defineModule(...)`; otherwise remove the wrapper.
- Pass bare `defineFields(...)` output to `defineModule(...)` and apply module registrations through
  `admin.fieldServers`. Remove any path that resolves a map before giving it to
  `defineModule(...)` or passes a `resolveServerFields(...)` result into another resolution call.
- Replace `FieldBehavior` with `ServerField`. Type registries with `ServerFieldKinds<typeof fields>` and
  obtain resolver entries from `defineServerField(...)` or
  `serverField(configuredField, resolver)`. The latter takes the configured output of `field(...)` or a
  configured field factory call such as `textField(...)`; it does not take the factory function itself.
  The typed registry surface does not accept raw `ServerField` objects.
  Derive resolved-map types from `resolveServerFields(...)` when needed instead of importing
  pipeline-stage types.

### Operational Error Reporting

Old API:

- `@kenstack/lib/errorLog` accepted an `Error`, optional message, and optional context data through a default export.

New API:

- `@kenstack/lib/errorLog` remains available for curated request and event
  logging. It accepts `{ name, message?, context?, error? }`, adds sanitized
  request and location context, and writes the event to the server error log.
  This API is appropriate for expected operational events such as a rate-limit
  rejection; it is not the unexpected-error reporting path.
- Unexpected errors are reported through
  `reportError(errorOrMessage, { context?, request?, source? })` from
  `@kenstack/lib/errorReporter`. Strings are converted to `Error` internally with a caller stack;
  existing `Error` objects retain their original stack and cause.

Migration steps:

- For a curated event that should remain in the server log, replace the old
  positional call with `await errorLog({ name, message, context, error })`.
  Choose a stable event name and keep structured context non-sensitive.
- Replace `errorLog(error, message, data)` with
  `await reportError(errorOrMessage, { context, request })`. Put details needed to understand the
  failure in the message. Keep `context` only for selected, non-sensitive structured values that are
  useful for filtering or correlation; do not repeat the message or pass the old `data` object through
  wholesale. Add `source` only when it distinguishes information that is not already clear from the
  message, stack, and request path.
- Pass the current `Request` when one is available so the reporter can include sanitized request metadata.

### Shared Quota Storage

Old API:

- The quota APIs used the shared `rate_limit_events` table directly, but
  `createDeps(...)` did not require its `rateLimitEvents` declaration in the
  host table registry.
- Password failures used the separate `login_failures` table.
- Callers used `rateLimitEmailRequest(...)` and `rateLimitIpRequest(...)` from
  `@kenstack/api/rateLimit`.

New API:

- The host database schema registry exports `quotaUses` from `@kenstack/db/tables/quotas`.
- `checkQuota(scope, options)` checks without recording, `consumeQuota(scope, options)` records without
  checking, and `claimQuota(scope, options)` atomically checks and records. Options accept a normalized
  `email`, the request `ip` from `getIp(request)`, and per-subject `limits` as `[max, within]` tuples.
  Only the subjects given are counted: public actions pass `ip`, and gates on an account, such as
  password failures, pass `email` alone so shared-IP traffic cannot lock sign-in.
- Email and IP uses have per-scope limits plus site-wide limits for the same subject value across every
  scope. A custom per-scope window cannot exceed its subject's site-wide window.
- Each `quotaUses` row stores its scope and the nullable normalized `email` and `ip` values directly.
  The old hashed key is not retained.
- Password failures use the `password-failure` scope and write durable request
  metadata through the audit logger instead of the quota table.

Migration steps:

- Export `quotaUses` with the host application's table registry.
- Replace `rateLimitIpRequest({ limits, name, request })` with
  `claimQuota(scope, { ip: await getIp(request), limits: { ip: [max, within] } })`.
  Replace email claims with `claimQuota(scope, { email, limits: { email: [max, within] } })`.
- Generate and commit an append-only host migration that replaces `rate_limit_events` with
  `quota_uses` and its declared indexes. Existing limiter rows use an incompatible hashed shape and are
  not migrated, so the replacement resets existing counters. Do not copy another host's generated
  migration or rewrite existing migration history.
- Drop the `login_failures` table in the same migration; `loginFailures` is no longer defined by
  `@kenstack/db/tables/sessions`. Password-failure callers use `checkQuota(...)` before password
  comparison and `consumeQuota(...)` after a failed comparison.

### Public-Action Email Quotas

Old API:

- Public actions passed email and IP quota options to
  `guardPublicEmailRequest(...)`, then called `@kenstack/lib/mailer` directly.
- Verification-email delivery applied its own quota independently.

New API:

- `recaptcha(...)` owns only the reCAPTCHA assessment.
- `claimQuota(scope, { email, ip: await getIp(request) })` atomically claims the recipient email and
  request IP quotas before the action calls the raw mailer. Email and IP values both have scoped and
  site-wide limits.
- Use this policy only when the public email address is the outbound recipient.
  Contact forms, inquiry forms, and other actions that notify internal staff do
  not consume an email quota; protect the originating submission through
  its own validation, reCAPTCHA, or submission-specific quota when needed.
- The raw mailer remains the boundary for trusted administrative and
  background email that must not consume public-action quotas.

Migration steps:

- Replace `guardPublicEmailRequest(...)` with a direct `recaptcha(...)` call,
  passing the quota name as its `action`; remove `email`, `emailLimits`,
  `ipLimits`, `onRateLimited`, and `rateLimitMessage`.
- Before preparing an email to the submitted public address, call
  `await claimQuota(scope, { email, ip: await getIp(request) })`, return its generic message with a
  429 status when exhausted, then send through the ordinary `mailer(...)` boundary. For an inquiry
  whose outbound recipient is internal staff, call `claimQuota(scope, { ip: await getIp(request) })`
  to claim only the originating IP quota. A call with no subject throws, so a request whose IP header
  is missing fails loudly instead of running unlimited.

### reCAPTCHA Availability

`recaptcha(...)` no longer returns a pipeline stage. Call it directly from the protected action after schema
parsing and cheaper application-owned guards, but before the protected side effect:

```ts
const recaptchaRejection = await recaptcha({
  action: "form_action",
  request,
  response,
  token: data.recaptchaToken,
});
if (recaptchaRejection) {
  return recaptchaRejection;
}
```

Include the token in the protected action's pipeline schema so malformed values become missing tokens instead
of form-field errors:

```ts
recaptchaToken: z.string().optional().catch(undefined),
```

Missing or invalid tokens, expired checks, low scores, wrong actions, and other documented assessment rejections
still stop the request. Availability failures fail open. Operator-actionable failures, including incomplete
configuration, transport failures, unusable responses, and over-quota assessments, are reported through
`reportError(...)` from `@kenstack/lib/errorReporter`. `browser-error` also fails open but is not
reported.

### Square Crop Value

Old API:

- `SquareCrop` included `mode: "center" | "manual"` and made `zoom` optional.

New API:

- `SquareCrop` is the manual crop coordinates `{ x, y, zoom }`.
- `null` represents the centered crop. An omitted `squareCrop` property means the crop was not submitted for change.

Migration steps:

- Replace centered crop objects with `null`.
- Remove `mode: "manual"` from manual crop objects and supply `zoom`; use `1` when an older value omitted it.
- If persisted media JSON contains crop objects, normalize those values before relying on the new type. No database column migration is required.

### Module Record Save Helpers

Old APIs:

- `saveAdminRecord({ moduleConfig, actionPrefix?, fields?, id, changes, values })` was used by both admin actions and site-owned profile actions.
- Site actions configured restricted media behavior separately on each server field.
- `saveRecord(...)` did not tell field handlers whether the save came from an admin action.

New APIs:

- `saveModuleRecord({ module, fields, id, changes, values })` saves a module record from an authenticated site action with restricted field authority and module-owned cache revalidation. The explicit field set defines that action's writable and returned surface; it must not be replaced with the module's broader admin fields.
- `saveAdminRecord({ module, id, changes, values })` saves through the standard admin path and supplies admin-save authority to field handlers.
- `saveRecord(...)` remains the low-level helper for custom persistence. It is restricted by default and accepts `admin: true` for backend actions that have already enforced admin access.
- Admin-save authority describes the backend action, not the current user's roles, and is never accepted from submitted data.

Migration steps:

- Rename the `saveAdminRecord` `moduleConfig` property to `module` and remove `actionPrefix` and `fields`; both are now derived by the admin save path.
- Replace non-admin `saveAdminRecord(...)` calls with `saveModuleRecord(...)`.
- Remove site-level server-field options that suppress admin metadata or media selection behavior. The save helper now supplies that context to field handlers.
- Add `admin: true` to direct `saveRecord(...)` calls owned by backend admin actions, such as custom settings or page-editor persistence. Leave ordinary authenticated actions on the restricted default.

### Admin Document Metadata

Old behavior:

- Catch-all admin pages exported only `createAdminPage()` and inherited the site's generic document title.

New behavior:

- Kenstack exports `generateMetadata()` from `@kenstack/admin/AdminPage`.
- The function parses the catch-all route, resolves the configured module title, and returns an absolute title such as `People · Admin` without loading the record.

Migration steps:

- Re-export the shared function as Next.js `generateMetadata` from the site's catch-all admin page. Next.js discovers metadata from route files, so `createAdminPage()` cannot install this named export itself.

  ```ts
  import { createAdminPage } from "@kenstack/admin/AdminPage";

  export { generateMetadata } from "@kenstack/admin/AdminPage";

  export default createAdminPage();
  ```

### Admin Theme Stylesheet

Old behavior:

- Sites supplied admin color tokens through their public global stylesheet.
- Admin styling could therefore inherit site-specific palette changes unintentionally.

New behavior:

- Kenstack provides complete light and dark admin palettes in `@kenstack/admin/theme.css`.
- The stylesheet is scoped to `body:has([data-admin-theme="light"])` and `body:has([data-admin-theme="dark"])`, including body-mounted admin portals without affecting public routes.

Migration steps:

- Import the stylesheet directly from the site admin layout:

  ```ts
  import "@kenstack/admin/theme.css";
  ```

- Keep `data-admin-theme="dark"` or `data-admin-theme="light"` on the admin layout wrapper.
- Remove copied admin palette declarations from the site's public global stylesheet. The host application still owns its Tailwind dark-variant strategy and public-site palette.

### Flat Server Field Implementations

Old APIs:

- The old `serverFields(...)` entries were resolver callbacks that received the client field and returned server behavior inside `{ behavior: { ... } }`.
- Resolved server fields exposed lifecycle and query behavior through `field.behavior`, such as `field.behavior.save` and `field.behavior.select`.
- Server filter configuration was stored at `field.behavior.filter`, alongside the client field's `filter: boolean` option.
- Custom resolver helpers used the `ServerFieldDefaults` return type.

New APIs:

- Kind registry entries are direct `ServerField` contributions with `load`, `save`, `preSave`, `delete`, `select`, `listSelect`, `upload`, and other server properties at the top level.
- Resolved server fields expose those properties directly, such as `field.save` and `field.select`.
- The client `filter: boolean` option remains unchanged. Standard filter behavior is selected by the
  separate isomorphic `filterKind` capability and its field options when the admin list is built.
- Custom resolver helpers do not need a patch-specific return type.

Migration steps:

- Remove the `behavior` object and register the implementation by semantic kind:

  ```ts
  // Before
  serverFields(fields, {
    title: () => ({
      behavior: {
        preSave: validateTitle,
        select: selectTitle,
      },
    }),
  });

  // After
  const fields = defineFields({
    fields: {
      title: field({ ...textField(), kind: "validated-title" }),
    },
  });

  defineModule({
    admin: {
      fields,
      fieldServers: {
        title: serverField(fields.title, () => ({
          preSave: validateTitle,
          select: selectTitle,
        })),
      },
      // ...
    },
    // ...
  });
  ```

- Remove `ServerFieldDefaults` return annotations from custom server-field helpers. Let TypeScript infer the return type, use `ServerField` for a direct field contribution, or use `ServerFieldResolver` for a helper that derives behavior from the client field.
- Replace resolved-field reads such as `field.behavior?.load`, `field.behavior?.save`, and `field.behavior?.select` with `field.load`, `field.save`, and `field.select`.
- Remove custom server filter patches and reads from `behavior.filter`. Server field implementations no longer expose filter configuration; keep the isomorphic field option as `filter: true`.

### Admin Table and Field Capabilities

Old APIs:

- `defineTable(...)` always added `publicId`.
- Reorderable admin tables manually added a `sortOrder` column to `columns`.
- Reorderable admin lists used `list.reorder = { field: "sortOrder" }` for the standard reorder column.
- Publishable tables manually added `metaColumns.visibility` and `metaColumns.publishedAt` to `columns`.
- SEO tables manually added `metaColumns.seoTitle`, `metaColumns.seoDescription`, and `metaColumns.ogImage` to `columns`.
- Publishable admin field maps used `defineFields({ ..., visibility: metaFieldOptions.visibility, publishedAt: metaFieldOptions.publishedAt })`.
- SEO admin field maps used `defineFields({ ..., seoTitle: metaFieldOptions.seoTitle, seoDescription: metaFieldOptions.seoDescription, ogImage: metaFieldOptions.ogImage })`.
- Plain field maps imported `defineFields` from `@kenstack/fields/defineFields`.
- An intermediate admin field-map API used `defineAdminFields` from `@kenstack/admin/fields`.
- `AdminTable` implied a `publicId` column.

New APIs:

- `defineTable(...)` accepts `publicId`, `reorder`, `publish`, and `seo` options.
- `publicId: true` adds the generated `publicId` column. Omit `publicId` for tables that do not need opaque public IDs.
- `reorder: true` adds the standard `sortOrder` column and active-record index.
- `list.reorder: true` uses the standard `sortOrder` field. Use `{ field, label }` only for custom reorder columns or labels.
- `publish: true` adds the standard `visibility` and `publishedAt` columns plus a `(visibility, publishedAt)` index where `deletedAt IS NULL`. This matches the standard `listQuery()` equality/range predicate; do not replace it with a `publishedAt`-only index.
- `seo: true` adds the standard `seoTitle`, `seoDescription`, and `ogImage` columns.
- Isomorphic `defineFields(...)` from `@kenstack/admin/fields` is the single field-map authoring API.
- `defineFields({ fields: { ... } })` defines plain field maps.
- `defineFields({ publish: true, fields: { ... } })` adds the standard `visibility` and `publishedAt` field definitions.
- `defineFields({ seo: true, fields: { ... } })` adds the standard `seoTitle`, `seoDescription`, and `ogImage` field definitions.
- `AdminTable` represents the base defined-table contract. Use `AdminPublicIdTable`, `AdminPublishTable`, or `AdminSeoTable` when code requires those generated columns.

Migration steps:

- For admin modules with `admin.list.reorder.field = "sortOrder"`, remove the manual `sortOrder` column from `columns` and set `reorder: true` on `defineTable(...)`.
- Remove manual active-record `sortOrder` indexes after setting `reorder: true`.
- Replace standard `list.reorder = { field: "sortOrder" }` with `list.reorder = true`.
- For admin modules with standard publishing fields, remove manual `visibility: metaColumns.visibility` and `publishedAt: metaColumns.publishedAt` columns and set `publish: true` on `defineTable(...)`.
- Replace manual active-record `publishedAt` indexes with the composite index generated by `publish: true`.
- For admin modules with standard SEO fields, remove manual `seoTitle`, `seoDescription`, and `ogImage` meta columns and set `seo: true` on `defineTable(...)`.
- Replace field-map imports from `@kenstack/fields/defineFields` with `@kenstack/admin/fields`.
- Replace `defineAdminFields(...)` with `defineFields(...)` from `@kenstack/admin/fields`.
- Wrap plain field maps in the new object shape, changing `defineFields({ title: textField() })` to `defineFields({ fields: { title: textField() } })`.
- For admin field maps with standard publishing fields, use `defineFields({ publish: true, fields: { ... } })` and remove the manual `metaFieldOptions` entries.
- For admin field maps with standard SEO fields, use `defineFields({ seo: true, fields: { ... } })` and remove the manual `metaFieldOptions` entries.
- For tables that relied on the old implicit `publicId` column, add `publicId: true` to `defineTable(...)` before upgrading.
- Remove `publicId: false` from tables that only used it to opt out of the old default.
- For table types or helpers that require `table.publicId`, use `AdminPublicIdTable`.

### Admin Server/Client Module Split

Old APIs:

- Site modules imported `defineModule` from `@kenstack/admin`.
- `defineModule(...)` accepted a `client` config directly.
- Server module files imported client config files, form components, list renderers, and field components through the module config.
- Admin pages could call `createAdminPage()` without passing client loaders.
- Module settings controls could import the module config and pass it to a shared control component.
- Custom field components could be passed as already-imported React components on field definitions.

New APIs:

- Server module definitions import `defineModule` from `@kenstack/admin/server`.
- Server admin registries import `defineAdmin` from `@kenstack/admin/server`.
- `defineModule(...)` is server-only and no longer accepts `client`.
- Client admin config stays in each module's `client.ts` and is loaded separately through a site-owned client loader map.
- Client admin config files import `defineClient` from `@kenstack/admin/client`.
- Site admin pages call `createAdminPage()` after `defineAdmin(...)` attaches client loaders to the module registry.
- Client loader maps use `defineAdminClients(...)` from `@kenstack/admin/clientLoaders`, with a map of dynamic imports.
- Sites expose the resolved module registry through `@app/modules`; admin pages, API routes, and the
  sidebar import it from that binding.
- Admin edit screens load records on the server through `loadAdminEdit` instead of posting `{ action: "load" }` from the client.
- Module settings client config is declared in `defineClient(...)` with bare `fields` and a supplied
  `SettingsForm`.
- Server field metadata imports should use explicit server-safe paths such as `@kenstack/admin/metaFields` instead of importing mixed admin APIs from the main admin barrel.
- Public routes that expose admin-only settings controls should pass the enriched registry module to `ModuleSettingsControl`; the control reads `module.client` internally.
- Generic custom field components are imported by the consuming form or shared `fields/formFields.ts`
  boundary and passed to `defineFormFields(...)` through its property-keyed `components` argument. The
  site-level client registry already lazy-loads the whole module client.
- The main `@kenstack/admin` barrel is for shared admin types, list metadata types, search-param helpers, and meta field constants. Do not use it for server-only builders or client config builders.

Migration steps:

- Before moving `defineModule(...)` from `admin.ts` or `server.ts` into a module `index.ts`, check whether that index currently exports shared components, browser-safe data, or types used by Client Components. Do not combine those boundaries; retain a separate server entry point or migrate every client consumer to explicit client-safe subpaths.
- Change server module imports from `@kenstack/admin` to `@kenstack/admin/server`.
- Change server admin registry imports from `@kenstack/admin` to `@kenstack/admin/server`.
- Change client config imports from `@kenstack/admin` to `@kenstack/admin/client`.
- Change metadata field imports from `@kenstack/admin` to `@kenstack/admin/metaFields` when the file only needs `metaFieldOptions`, `visibilityOptions`, or `visibilityValues`.
- Import database query helpers such as `listQuery` and `pageQuery` from `@kenstack/db/queries`; they do
  not belong on the main admin barrel.
- Keep page editor imports on the page editor subpaths, for example `@kenstack/admin/pageEditor`, `@kenstack/admin/pageEditor/loadContent`, `@kenstack/admin/pageEditor/TextEdit`, and `@kenstack/admin/pageEditor/MarkdownEdit`.
- Remove `client` from every `defineModule(...)` call. Keep only server-safe admin config, settings table config, fields, handlers, cache tags, and route metadata in the server module file.
- Keep each module's admin UI config in `client.ts`, exported as `client = defineClient(...)`.
- Add a Client Component loader map in the site, for example:

  ```ts
  "use client";

  import { defineAdminClients } from "@kenstack/admin/clientLoaders";

  export const clients = defineAdminClients({
    news: () => import("./news/client"),
    users: () => import("./users/client"),
  });
  ```

- Pass that loader map to the site module registry so each module entry gets a `client` loader:

  ```ts
  import { clients } from "./clients";

  export const modules = defineAdmin([news, users], clients);
  ```

- Map `@app/modules` to the host module registry.
- Replace `createAdminPage({ adminConfig })` with `createAdminPage()` and `adminPipeline({ adminConfig })` with `adminPipeline()`.
- Remove the `admin` prop from `Sidebar`.
- Remove client queries that post `{ action: "load" }`; let `<Edit />` load server edit data and use `adminLoadCacheTag(...)` when save or remove actions invalidate cached records.
- Directly re-export `generateMetadata` from `@kenstack/admin/AdminPage` alongside
  `export default createAdminPage()`. `createAdminPage()` reads `modules[name].client` from
  `@app/modules`, while Next.js discovers metadata through the route file's named export.
- Do not import `client.ts`, form components, list item renderers, or other admin Client Components from server module files.
- For module settings, pass the bare settings field map and a module-owned form to `defineClient(...)`
  as `settings: { fields: settingsFields, SettingsForm }`. The form imports generated controls from its
  module-owned form-fields file just like an admin `EditForm`; it may also render bespoke controls.
  The settings modal continues to own loading, validation, saving, notices, and submission.
- Render settings controls with a module entry from the `defineAdmin(...)` registry. Do not pass a separate `loadClient` prop:

  ```tsx
  import { modules } from "@/modules";
  import ModuleSettingsControl from "@kenstack/admin/moduleSettings/Control";

  <ModuleSettingsControl module={modules.stays} title="Book a Stay Settings">
    <BookingRequest />
  </ModuleSettingsControl>;
  ```

- For generic custom field components, remove `component` from the field definition and register each
  property in `defineFormFields(fields, { components: { myField: MyField } })`. Pass the isomorphic field
  map directly as `defineClient(...)` `admin.fields`. The field component should be a Client Component
  when it uses hooks, browser APIs, or client-only libraries.
- For any dynamic/lazy loader intended to keep optional client code out of public route bundles, make the loader file itself a Client Component. Next.js currently does not reliably keep dynamically imported Client Components split when the loader is a Server Component; `ssr: false` also only belongs inside Client Components.
- Keep loader props serializable when a Client Component loader is rendered by a Server Component.

### Address Field Helpers

Old APIs:

- `@kenstack/admin/address`
- `createAddressFieldOptions({ defaultCountryCode, required })`
- `addressFieldOptions`
- `requiredAddressFieldOptions`
- `addressColumns.countryCode` and the address field helpers implicitly defaulted the country to `"US"`.

New APIs:

- `@kenstack/fields/address`
- `defineAddressFields({ required, countryCode, addressLine1, addressLine2, locality, regionCode, postalCode })`
- Address field customization is keyed by field name.
- Use `countryCode: { default: "CA" }` instead of `defaultCountryCode: "CA"`.
- Address columns and fields no longer assume a country. Their default country code is now `""` unless the site sets one explicitly.

Migration steps:

- Replace direct imports from `@kenstack/admin/address` with `@kenstack/fields/address`.
- Replace `createAddressFieldOptions(...)` with `defineAddressFields(...)`.
- Spread address field bundles directly into the field map instead of assigning the bundle and copying each field one by one.
- Review every table that spreads `addressColumns` and every field map that uses `defineAddressFields(...)`. Keep their country defaults aligned.
- Existing database columns retain their previous default until a migration changes it. Generate and apply a migration that sets `country_code` to `DEFAULT ''`, or deliberately retain the site's country with an explicit default such as `DEFAULT 'US'` or `DEFAULT 'CA'`. This changes future inserts only; it does not rewrite existing country values.
- Sites that should keep an implicit country must also set the form default explicitly:

  ```ts
  ...defineAddressFields({
    countryCode: { default: "US" },
  }),
  ```

- Override the generated table column to match that field default:

  ```ts
  columns: {
    ...addressColumns,
    countryCode: varchar("country_code", { length: 2 })
      .notNull()
      .default("US"),
  }
  ```

- Move `defaultCountryCode` to the `countryCode` override:

  ```ts
  ...defineAddressFields({
    required: true,
    countryCode: { default: "CA" },
    addressLine1: { list: true },
    locality: { list: true },
    regionCode: { list: true },
    postalCode: { list: true },
  });
  ```

### Node 24 Runtime Floor

New requirement:

- Kenstack now requires Node.js 24 or newer.

Migration steps:

- Update app/package engines, local runtime managers, deployment settings, and CI images to Node.js 24 or newer.

### Managed Content Table Columns

Old APIs:

- The built-in `content` table defined only `id`, timestamps, `slug`, metadata, and `data` columns.

New APIs:

- The built-in `content` table is defined through `defineTable(...)`.
- This adds the standard managed columns and indexes used by admin records, including `public_id`, `created_by`, `deleted_at`, `content_deleted_at_idx`, and `content_created_at_idx`.

Migration steps:

- Existing sites with a `content` table need a database migration before deploying this version.
- Add the new managed columns with appropriate defaults/nullability, backfill existing rows as needed, and create the new indexes.
- Keep the existing `content_slug_unique` unique index.

### DateTime Field Naming

Old APIs:

- `DateField` from `@kenstack/forms/DateField` and `@kenstack/admin/forms`.

New APIs:

- `DateTimeField` from `@kenstack/forms/DateTimeField` and `@kenstack/admin/forms`.
- `DateField` now means a date-only field that stores `YYYY-MM-DD` values.
- `dateField()` is available from `@kenstack/fields` for date-only fields.

Migration steps:

- Replace imports and JSX usage of `DateField` with `DateTimeField` when the field stores a date and time.
- Audit the corresponding Drizzle column before renaming. Fields backed by `dateTimeField()` should use a timestamp/datetime column, not a Postgres `date` column.
- Keep domain date-only fields, such as birthdays or death dates, on Postgres `date` columns and use `dateField()`.

### Draft Mode Preview Transport

Old APIs:

- Public preview URLs used a `?preview` search parameter.
- `isPreview(searchParams)` checked the preview search parameter.
- Public page/list queries accepted options such as `{ preview: boolean }`.
- `pageWhere(table, { preview })` used the preview flag to include drafts.
- `createMetadataLoader` was exported from `@kenstack/admin` and `@kenstack/admin/metadata`.
- Site admin API routes only needed to expose `POST` from `adminPipeline(...)`.

New APIs:

- Preview uses Next.js Draft Mode through the admin API GET route.
- Admin preview links use `/api/admin?action=enable-draft&next=/path`.
- Draft Mode can be disabled with `/api/admin?action=disable-draft&next=/path`.
- Modules with a `slug` field default to `/${name}/${slug}` preview paths.
- `draftMode()` from `next/headers` checks the current request's Draft Mode state.
- Public list queries and uncached page queries may accept `{ draft: boolean }`. Cached detail loaders
  use `resolveVisiblePage(...)` to detect the current request's Draft Mode state.
- `resolveListDraft()` and `listQuery(table, { draft, ... })` from `@kenstack/db/queries` own Draft Mode
  authorization and list visibility. `pageQuery(...)` owns the page row query, while
  `resolveVisiblePage(...)` owns request-time page visibility.
- Route files declare `generateMetadata` directly and call their ordinary detail loader.
- Site admin API routes must expose both `GET` and `POST` from `adminPipeline(...)`.

Migration steps:

- Update site admin API routes from `export const { POST } = adminPipeline({ adminConfig })` to
  `export const { GET, POST } = adminPipeline()`. Admin modules are loaded from `@app/modules`.
- Replace `isPreview(searchParams)` with `(await draftMode()).isEnabled` from `next/headers`.
- Replace metadata factories with the direct route-owned callback described in
  **Route-Owned Page Metadata** above.
- Rename local query options from `preview` to `draft`; pass `draft` to `listQuery(...)` for list queries.
  Use `pageQuery(...)` with `resolveVisiblePage(...)` for page queries as documented
  above for cached detail pages.
- Remove `preview` search parameter propagation from public links, breadcrumbs, back buttons, tag links, and list/detail links.
- Keep module `admin.preview` path templates; they still define the preview target path, but the admin preview button now routes through Draft Mode before redirecting to that path.
- Remove explicit `admin.preview` when it only matches the default `/${name}/${slug}` path.
- Use normal links or anchors, not prefetched Next links, for disable-draft URLs so prefetching cannot clear Draft Mode before the user clicks.

### Media Table And Media List Field Naming

Old APIs:

- `images` database table.
- `image_kind` and `image_status` enum names.
- `defineMedia(...)` for ordered media join tables.
- `mediaField(...)` and `<MediaField />` for ordered multi-media fields.
- Internal field kind `"media"`.
- Ordered media join tables used `image_id` and index/FK names such as `blog_media_blog_id_image_id_unique`.
- `SelectedImage`, `selectImage(...)`, and `selectImageSubquery(...)` for media selector helpers.

New APIs:

- `media` database table.
- `media_kind` and `media_status` enum names.
- `defineMediaList(...)` for ordered media join tables.
- `mediaListField(...)` and `<MediaListField />` for ordered multi-media fields.
- Internal field kind `"media-list"`.
- Ordered media join tables use `media_id`, `blog_media_unique`, `blog_media_sort_order_idx`, `blog_media_blog_fk`, and `blog_media_media_fk` style names.
- `SelectedMedia`, `selectMedia(...)`, and `selectMediaSubquery(...)` from `@kenstack/db/queries` for
  media selector helpers.

Migration steps:

- Rename `images` to `media`, `image_kind` to `media_kind`, and `image_status` to `media_status`.
- Rename ordered media join columns from `image_id` to `media_id`.
- Rename imports from `defineMedia` to `defineMediaList`.
- Rename field helper and component imports from `mediaField` / `MediaField` to `mediaListField` / `MediaListField`.
- Rename selector helper imports from `SelectedImage`, `selectImage`, and `selectImageSubquery` to `SelectedMedia`, `selectMedia`, and `selectMediaSubquery`.
- Keep singular image fields such as `image`, `ogImage`, or `avatar` named for their domain role; those fields can still store ids from the generalized `media` table.
- Keep `"original"` and `"square"` selector variants where image renditions are needed. File media ignores the variant and returns its source URL with null dimensions.

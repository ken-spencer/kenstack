# Host wiring work order

## Status

All decisions ruled with Ken on 28 September 2026. The build plan below was reviewed clean by Opus and
Astra over seven pre-build rounds the same day; ready to build. Source: the 28
September 2026 sweep of Civic for site code that rewrites, copies or sets up Kenstack's work,
corrected by independent Opus and Astra reviews that read every cited file, plus a look at the Osprey
and Agate Springs sites. Payments and checkout were out of scope.

The site-only fixes need no decision: the site starts using what Kenstack already has. The last
section records what was looked at and deliberately left alone or deferred.

## Checked: the /login details step

On `/login`, the account-details step's form and its controller each get their own browser data cache,
because nothing above them provides a shared one. Checked 28 September 2026 by code reading (no
browser reproduction was possible without sending email or a test account): it does not strand
visitors, because the form marks the step done itself when it saves. The costs are a likely duplicate
`load-details` request after sign-in and a stale controller copy that matters only on an account
switch. The StepFlow data-cache ruling removes both. `/donate`, `/take-your-seat` and
`/private-screenings` already share one provider and are unaffected.

## Ruled

### Current user carries site fields — ruled 28 September 2026

- **Problem:** every signed-in Civic page reads the user row twice: Kenstack's cached current user,
  then Civic's `loadAccountDetails` for address and phone, cached separately but cleared by the same
  users edit. Civic's `requireAccountUser` also rebuilds `requireUser`.
- **Ruling:**
  - Kenstack's users area exports `defineUsersModule`, a users-specific wrapper around
    `defineModule`; Kenstack's base users module becomes `defineUsersModule({ admin: { fields, table: users } })`, and sites define
    theirs with it, inheriting its defaults (icon, title, list columns). The list sorts come from the user fields'
    own `sort: true` (given name, family name, email), with no combined "Name" sort. The generic
    `defineModule` gains nothing.
  - `currentUser.select: (users) => ({ … })` adds columns or SQL subqueries to the cached current-user
    query, following `listQuery`'s `select` pattern; no `joins` until something needs them. It lives on
    the users module, not `deps`, so subqueries can import other tables without an import cycle through
    `deps`.
  - `publicUser: (user) => ({ … })` adds fields to what the browser receives. It runs after the cache on
    each request, so it can compare stored values with the current time (membership expiry, for
    example); it adds to Kenstack's public shape and cannot remove from it. Extra fields stay
    server-only unless it exposes them.
  - The added fields' types flow through the typed module registry to `getCurrentUser()`,
    `requireUser()` and `useUserInfo`.
  - `defineUsersModule` keeps `defineModule`'s shape, `admin: { … }`, with `currentUser` and
    `publicUser` beside it. A users module built with plain `defineModule`, as Osprey's is, keeps
    working with Kenstack's defaults.
  - Kenstack awaits `io()` before calling `publicUser`, as it does before the session expiry check.
  - A subquery's data is cached with the user: any write to data a subquery reads (a membership
    purchase, say) clears `adminLoadCacheTag("users", userId)`, as Kenstack's docs prescribe for writes
    outside module saves.
  - Before building, a spike in Civic's `tmp/` proves the types flow from `currentUser.select` into
    `publicUser` and `loginDestination`.
  - `admin` is required: Kenstack's own users module passes it like a site does, so there is no
    default admin config and no cast.
  - Kenstack's code never names a site's fields: `defineUsersModule` records the options a site passes
    in one generic, and Kenstack reads `{ ...usersDefaults, ...modules.users }`, so the site's types
    reach `getCurrentUser()` and `useUserInfo` through `@app/modules` with no conditional types or
    casts.
  - Kenstack's current-user values always win over a site's selected field of the same name, with no
    type rule, startup check or cast.
- **Then, site-side:** `loadAccountDetails` picks from the current user; `requireAccountUser` goes in
  favour of `requireUser("authenticated", path)` (callers change `userId` to `id`); Civic's copied
  users list columns go. On the client, the list columns live in Kenstack's exported users client
  config (`@kenstack/modules/users/client`), not the server module. `defineClient` only types its inputs and
  returns them; the admin client loader builds each registered client once (one-to-one relations,
  settings schema). A site that differs composes Kenstack's client directly:
  `defineClient({ admin: { ...usersClient.admin, fields, EditForm } })`. No new export, no
  `satisfies`, and no generic, conditional type or cast in `defineClient`.

### Rename `fieldServers` to `serverFields` — ruled 28 September 2026

- The admin option that holds each field's save-time handlers is declared as
  `fieldServers?: ServerFields<TFields>`, filled by `serverField`, `serverTagField` and
  `serverMediaListField`, and described in the docs as the "server field" lifecycle. The property name
  is the odd one out.
- Rename it to `serverFields` everywhere, including `defineOneToOne({ fieldServers })` and payments'
  campaigns module, with a CHANGELOG note, alongside `defineUsersModule`, which touches the users
  module anyway. Mechanical in Civic (events, users, video rentals, concessions and others), but a
  break for other sites. Word the note so Agate Springs does not confuse the property with its retired
  `serverFields(...)` function.

### Saves always clear the module's own cache tag — ruled 28 September 2026

- Kenstack already tags admin data with the module name, and public pages tag theirs with it, but
  Kenstack only clears that tag when a module lists its own name in `admin.revalidate`. Nine modules do
  so by hand, and one that forgets leaves its public pages stale.
- Kenstack clears the module-name tag on every save, delete and reorder: one line each in
  `admin/queries/save.ts`, `admin/api/remove.ts` and `admin/api/reorder.ts`. `admin.revalidate` then
  lists only other things a change affects. Sites drop their self-listings (nine in Civic), with a
  CHANGELOG note; a leftover entry only clears the same tag twice.

### StepFlow and the admin bring their own data cache — ruled 28 September 2026

- Kenstack's `QueryProvider` holds the browser's copy of server data; a provider inside another
  reuses it, but two side by side keep separate copies. Civic adds providers by hand in about eleven
  places. On `/login` the account-details step's form and controller each get their own; it does not
  strand visitors (see "Checked" above) but costs a duplicate request and a stale copy.
- `StepFlow` renders one `QueryProvider` around the whole flow, steps and controllers included, and
  Kenstack's admin sidebar renders one for the admin area. No new option. Civic drops the inner
  wrappers; a page whose own wrapper reads data above the flow (membership, private screenings)
  keeps one provider there, which the flow's reuses.
- A site-wide provider was rejected to keep pages without a form or flow light, the home page above
  all: React Query costs about 8 KB gzipped for the provider and about 11 KB with its hooks. The home
  page loads none of it today.

### StepFlow makes its own render per-request — ruled 28 September 2026

- `StepFlow` creates a random visit id on each server render, which Next.js allows only in a
  per-request render. A CHANGELOG note makes sites guarantee that before every flow; Civic's
  membership page calls `connection()` for it, and most flows are covered only because their sign-in
  step reads the session cookie.
- `StepFlow` calls `await io()` just before creating the id, where the random call is. It does nothing
  when the render is already per-request. The CHANGELOG note goes, and membership drops its
  `connection()`.

### Kenstack owns the style-guide page; sites opt in — ruled 28 September 2026

- Kenstack's admin style guide frames a page, `/style-guide/<context>`, in base, admin or site
  styling. A CHANGELOG note made every site write that page with Kenstack's checks (admins only,
  development only, valid context names).
- Kenstack owns the page, its checks and its context names. The style guide is optional: a site that
  wants it opts in, and one that does not adds nothing, so Osprey and Agate Springs lacking it is not a
  fault. The CHANGELOG stops asking every site for it.
- Serving it through the admin router is not easy: every `/admin` page gets the site's own
  `app/admin/layout.tsx` (sidebar and admin theme), and Kenstack cannot import the site's theme. So
  opting in means a stub route that imports the site's theme and re-exports Kenstack's page and
  metadata, like `app/admin/[...admin]/page.tsx`. Without the stub, `/admin/style-guide` in
  development shows a 404 inside its frame, which is acceptable for a site that has not opted in.

### Admin list defaults — ruled 28 September 2026

- The default title cell uses `getAdminRecordTitle` (title, then name, then slug), keeping the "ID n"
  fallback. It applies only to modules without custom list columns, so video shelves and collections,
  whose custom lists only show the name, drop them; locations, theatres, ticket pricing and membership
  plans keep theirs, which add other columns.
- Publishable modules, whose tables have the visibility and publish-date columns (the same test that
  enables the editor's publish control), always show the Published/Draft column, with or without
  custom columns. Not configurable. Non-publishable modules never show it. Modules that add the
  column by hand drop it: locations, membership plans and theatres in Civic, and Osprey's
  destinations, FAQs and trailers at its next upgrade. CHANGELOG note, since hosts with such columns
  would otherwise show it twice.

### Account links for the mobile slide-out — ruled 28 September 2026

- Civic and Osprey fill Kenstack's generic `MobileNav` slide-out with their own links, and each
  hand-copied `AccountMenu`'s account links into it. Civic's copy reads sign-in once on the server, so
  a visitor who signs in mid-flow on a phone still sees "Sign in" there until a full page load.
- Kenstack exports an inline account component (working name `AccountLinks`) sharing `AccountMenu`'s
  links, live sign-in state, Logout and signed-out fallback; only its presentation differs. The site
  places it inside `MobileNav` wherever it wants. No flag on `MobileNav` or `AccountMenu`, so the
  slide-out stays generic and the site keeps control of order and placement. The Admin link stays a
  site choice. Civic drops its copy; Osprey, 43 commits behind Civic's Kenstack, drops its copy at its
  next upgrade.
- Menus must update immediately on every sign-in. Ruled 28 September 2026, after two review rounds
  showed where a plain refresh breaks:
  1. After any sign-in inside a flow, `/login` included, Kenstack fires `router.refresh()` without
     waiting on it, so both menus and any other identity-dependent server output update. `items` stays
     an unchanged server function, so no route list reaches the browser. A standalone sign-in already
     does a full page load.
  2. `/login` stops redirecting signed-in visitors on the server (`src/app/(site)/(auth)/login/Flow.tsx`
     calls `redirect()` on every render for a signed-in visitor, which the refresh would trigger
     mid-flow). A signed-in visitor walks the flow instead: the login step skips, details skip when
     complete, and Kenstack's final step navigates. This also drops a second copy of the landing rule;
     a visitor arriving already signed in sees the flow briefly before it navigates.
  3. Bug fix: `useConsumedSearchParam` passes `null` to `replaceState` instead of Next's history state,
     so Next's router drops a consumed parameter and a refresh or reload does not bring back a used
     `token`, `confirmEmailChange` or `cancelEmailChange`. It already bites today, where the profile
     page refreshes after an email-change confirmation.
  4. `StepFlow` saves the step list it started the visit with (which steps were skipped) in its existing
     browser store, and later server renders, the sign-in refresh included, reuse it instead of the
     server's new values, so the login step keeps its place and Back reaches "Signed in as… / Use a
     different account". The store already defines one use of the flow (`localStorage`, 24 hours,
     refreshed by every write), and the saved list resets with it: when a finished flow is cleared for a
     new visit, or when the store expires. No in-memory "refresh coming" flag and nothing in the URL.
     A refresh landing after a flow finishes would clear it, but the refresh lands well under a second
     after sign-in and no flow finishes that fast; the smoke test checks it rather than code guarding it.
     Details the reviews found:
     - The login step's controller decides "the visit started signed in" from that saved step list,
       exposed through `useStep()`, not from the latest server render; otherwise its own override would
       win after the refresh. A saved "skipped" with identity now missing brings the step forward, as
       identity loss already does. `undefined` (an ordinary step) and `false` (a blocking prerequisite)
       stay distinct; live overrides stay authoritative for account details and identity loss.
     - When a finished or expired store starts afresh, `StepFlow` also resets the in-memory skip
       overrides of the previous visit, and `useStep()` exposes a visit counter that bumps then; the
       controllers that set skip values include it in their effect inputs, so they recompute without
       remounting (remounting would re-run the payment hold controller's mount effects). A refresh
       within the same stored visit keeps the overrides.
     - Until the saved list is readable (hydration, and a first visit before it is written), the login
       controller uses the server's `skipped`, which at that moment is the visit's starting value.
     - The saved list is written only after a finished flow's clear has run, and ignored while the
       finished marker is set, so a new visit never briefly uses the previous visit's list.
  5. `docs/step-flow.md` states the rule this relies on: inside a flow, the server render can run again
     mid-visit. Steps may vary their server-rendered content, but a refresh must not change the visit's
     step list, which steps exist and which are skipped, because that would break Back and Forward
     continuity; the flow's client parts own the step list for the visit, as item 4 does for the login
     step. Rewrite the "Login No Longer Waits for a Server Refresh" CHANGELOG note, the "with no server
     refresh" line in `docs/step-flow.md`, and the comment in `auth/components/Login/Step/index.tsx`.
- History: the embedded sign-in dropped its refresh in commit `a4f934e` (14 September 2026), when steps
  stopped depending on server-composed state; the parameter passing that made state survive the
  refresh was never committed and must not come back. If the flow needs anything else carried across
  the refresh, stop and ask Ken.
- Astra smoke-tests it in the browser during the build, signing in either with a dev test account
  whose credentials Ken puts in a seed or example-config file, or with Ken typing the emailed code
  himself when the flow reaches sign-in (agents do not read his mail or enter his codes): sign in
  part-way through `/login`, membership, donate, seats and private screenings, and through an emailed
  link inside a flow. The flow stays on its step with typed values kept, `/login` reaches its details
  step, no retained page resurfaces, both menus show the account links (and Admin for an admin), the
  account-details step shows saved details, used link parameters do not come back, and Back after
  sign-in still reaches the sign-in screen.
- No flow ends on a sign-up, so the sign-in refresh always lands mid-flow. Civic's volunteer flow
  becomes interests (areas) → sign in → details → note and send → "Thank you"; its details step saves
  like the others, and `AccountDetailsStep`'s `submission` mode goes (ruled 28 September 2026 after
  unit 9's review found the refresh could reset volunteer's "Thank you").

### Schemas never carry the reCAPTCHA token — ruled 28 September 2026

- Kenstack's `Form` attaches the token and `pipelineStage({ recaptcha })` verifies it, but the stage
  reads it from validated data, so every protected schema must declare `recaptchaToken` (four in
  Civic).
- The stage reads the token from the raw request body before validation; no schema declares it, and
  the stage's type no longer requires it. Kenstack's own sign-in handlers, which check reCAPTCHA by hand
  after a quota check, read it the same way and drop their fields. Civic's four fields go. Individual
  schemas never know about the token. Payments' hold action (`payments/src/holds/api.ts`) also
  declares it; it is on the money path, so coordinate with the payments session. Rewrite the
  Unreleased "Pipeline stages as actions" note and `docs/forms.md`.
- Hand checks pass the raw body: `recaptcha({ action, body: dataIn, request, response })` finds the
  token itself, so its field name lives in one place with the stage's reader.

### One query builder under list, page and current-user queries — ruled 28 September 2026

- `listQuery` and `pageQuery` build Kenstack's public queries, and the current-user query gains a site
  `select` (ruled above). `pageQuery` cannot join, so Civic's movie page rebuilds it, and about a dozen
  joined queries hand-write the "visible and not deleted" condition, many leaving out the "published
  before now" part on purpose because a time inside a cached query freezes that moment.
- Kenstack adds one public query builder that collects clauses in any order and any number of times
  (`select` merges, `where` ANDs, joins accumulate) and produces the Drizzle query at the end, since
  Drizzle's own `.where()` replaces rather than adds. It offers a "visible and not deleted" clause
  without the time part. `listQuery`, `pageQuery` and the current-user query become thin layers over
  it, keeping their own caching and publication rules; sites use it directly for queries that fit none
  of them.
- **Condition:** Drizzle's type inference must survive. Merged selects are straightforward; left-join
  nullability is the risk, because Drizzle infers it from the join chain. Adopt the builder only when
  type fixtures under `tests/types/` show merged selects, repeated `where`, left-join nullability, and
  `listQuery`, `pageQuery` and current-user results inferring exactly as today.
- **Fallback:** `pageQuery` gains `joins` like `listQuery`, and Kenstack exports the "visible and not
  deleted" condition for joined tables.
- **Spike, 28 September 2026: builder feasible; the adoption gate stays.** A prototype in Civic's
  `tmp/query-builder-spike/` (ignored by git) passes type checks for merged selects, repeated `where`,
  left-join nullability and clause order, with the builder's type equal to the hand-written Drizzle
  query's. It does not yet cover the real `listQuery` and `pageQuery` wrappers (with and without SEO
  fields), their existing `joins` callback, whose return value is ignored today and must keep working,
  or the session-based current-user query; fixtures for those come first in unit 6. It tracks join nullability with Drizzle's exported `AppendToNullabilityMap`, merges
  selections into one flat type (an intersection type broke the equality check), and needs one internal
  `as never` where the query is built, guarded by that equality check. Limits: left and inner joins
  only; the built query should hide Drizzle's `.where()` so callers cannot replace the combined
  conditions; the type helper comes from a Drizzle subpath that an upgrade could move, which the same
  check would catch.
- Whether an unpublished venue hides a whole showing or only its address stays a site decision.
- `listQuery`'s `joins` callback receives Kenstack's query builder, not Drizzle's query, so a `.where()`
  in it adds to the visibility filter instead of replacing it. Queued until after the smoke tests; if
  the builder cannot stand in for the existing callbacks, bring Ken the options.

### Sign-in settings live on the users module — ruled 28 September 2026

- Civic sets where a user lands after signing in (`loginDestination`) and where password-reset emails
  point (`resetPath`) in its auth API route, which pages cannot read. So the login page repeats the
  landing rule twice (a server redirect, and a browser redirect in a final step a CHANGELOG note asked
  for), and `/account/password` is written three times.
- Both move to `defineUsersModule` beside `currentUser` and `publicUser`, as `loginDestination: (user)
=> path` and `passwordPath` (names open), with Kenstack's defaults (`/` and `/reset-password`). The
  auth API and pages read them through the module registry; the auth route stops taking them.
  `loginDestination` receives the typed current user, site fields included. `deps` keeps only site-wide
  settings that belong to no module.
- Kenstack owns the final "go to your destination" step, so Civic's `LoginReturn` and its copies of the
  landing rule go. The step runs in the browser, where the users module is not available, so it uses
  the destination the server already resolves, returned with the sign-in or user-info response (an
  internal format). The password form reads `passwordPath`, dropping its `path` prop and needing no
  proxy change.
- The destination options also go from `authPipeline`, `createEmailLogin` and `loginPipeline`, so no
  competing setting remains. `loginDestination`'s input changes from the public auth state
  (`userId`) to the current user (`id`). CHANGELOG: rewrite the Unreleased "Login Destination" and
  "Reset Password Path" notes and the line asking hosts for a final step.

### `mailer` defaults the sender — ruled 28 September 2026

- Eight Civic senders, Kenstack's own and payments' receipts and refunds look up the sender address
  from `@app/email` and each check "email not configured", reacting differently when it is missing.
  Coordinate payments' two with the payments session.
- `mailer` fills in the sender when none is passed and reports a missing sender as a failed delivery,
  which callers already handle, so a contact-form visitor sees the friendly "couldn't send, please email
  us" message instead of a server error. The missing-sender case is real (a preview deployment, or site
  settings not yet saved) but is handled once, in `mailer`; callers drop their lookups and checks. The
  logo attachment stays with each email's template, since error-report emails must not carry it.

### Site settings are extended, not copied — ruled 28 September 2026

- Civic adds about 23 settings to Kenstack's site settings, so it replaced Kenstack's module: its own
  table (which collides with Kenstack's in the table barrel), its own loader, and an exact copy of
  `loadSiteSettingsMetadata`.
- Site settings follow the users-module pattern: Kenstack's module is extendable, sites declare their
  extra fields and defaults on top of Kenstack's base settings, Kenstack's loader reads both in one
  read (built on the query builder), and sites use `loadSiteSettingsMetadata` as is. Civic keeps only
  its own definitions; its loader and metadata copy go. The extension's shape (table, module and
  loader) is new site-facing API, so show it to Ken before building it, under "Ask first". Check that
  Civic's database schema is unchanged (`drizzle generate` shows no migration).
- Shape ruled: `defineSiteSettingsModule({ admin })`, like `defineUsersModule`, fixes the module name
  the loader reads, the title and the icon. `loadSiteSettings` reads the registered module's table
  and fields, destructuring out only its internal columns so the site's settings keep their types. Kenstack's `site_settings` table leaves the `@kenstack/db/tables` barrel; each site
  exports Kenstack's table or its own, as for users.

### Dashboard is a registry link — ruled 28 September 2026

- The sidebar highlights a link on every page under its path, so a registry link to `/admin` would stay
  lit everywhere; Civic builds its Dashboard link by hand from Kenstack's sidebar parts with `exact`.
- Kenstack's sidebar always matches the admin root `/admin` exactly; no `exact` option. Dashboard
  becomes a registry link, and the registry accepts a link at the top level, shown in order without a
  heading, as Dashboard is today; the registry's entry type widens to allow it. Civic's hand-built
  `sidebarBefore` group goes. `AdminSidebarNavLink`'s `exact` prop is public and Civic uses it, so
  removing it needs a CHANGELOG note.

### `formatDateKey` defaults to the site's time zone — ruled 28 September 2026

- `formatDateKey` turns a moment into a calendar date and requires a zone, so Civic passes the site's
  by hand; forgetting it makes "today" flip at 5 pm Vancouver time on the UTC server.
- It defaults to the site's time zone, like Kenstack's other date helpers, and still accepts an explicit
  zone. `formatLongDate` stays as is: its no-zone form formats calendar dates built in the browser, and
  a site default would show 28 September as the 27th for staff further east.
- Later: a customer that is a chain may have venues in several zones. Locations already store their own
  time zone, and explicit zones remain possible; design it when such a customer appears.

### Saves take their fields from the validated values — ruled 28 September 2026

- `saveModuleRecord` requires a field list separately from the module, so Civic's profile and
  account-details saves each build the same list from the users module and the account-details schema.
- `saveModuleRecord` works out the fields to save from the validated values: only fields present in
  them are written and only their field handlers run. Callers stop passing a list: Civic's profile,
  account-details and volunteer saves, and Osprey's two at its next upgrade. The admin's `changes`
  filtering and the volunteer save's server-added `volunteerStatus` field keep working. The action's
  Zod schema, which strips undeclared fields, is the allowlist, so a member-facing schema lists only
  what members may change. CHANGELOG note, since `saveModuleRecord` is public.

### `uploadMedia` defaults its action names — ruled 28 September 2026

- Civic's TMDB artwork import attaches a downloaded poster and backdrop from its own panel, so it cannot
  go through `ImageField`, whose upload function is private to its picker and drag-and-drop. It already
  uses Kenstack's exported `uploadMedia` and `mediaValueFromUpload`, repeating only the admin context and
  the two upload action names.
- `uploadMedia` defaults its action names to `"get-presigned-url"` and `"upload-complete"`, which
  `ImageField` already defaults to, and Civic stops passing them. Nothing else changes; the TMDB
  download stays Civic's.

### `deps` stays isomorphic; roles get their own import — ruled 28 September 2026

- About 20 client files in Kenstack, payments and Civic read `@app/deps`, mostly for the time zone.
  Anything the browser imports ships whole, so `deps` holds only browser-safe values, and the full
  role list, folded into `deps` by commit `614e8f4`, currently rides into public pages with it.
- Roles return to their own `@app/roles` binding. Kenstack owns the default role list, so roles it adds
  later reach every site; a site's `roles.ts` is by default a one-line re-export of Kenstack's defaults
  and adds its own roles only when it needs them. Only admin and server code import it, so public
  pages never carry the list; admin JavaScript does, which is fine behind sign-in. Public forms import the users field definitions for their name, email and address fields, so the
  role field moves to an admin-only file in Kenstack (`userRoleField` and the role-bearing field set)
  and Civic splits its `fields.ts` the same way: a role-free set for public schemas and the admin set
  with roles. `userRoleField` and the role-bearing `fields` export are public, so their new location gets a line in
  the CHANGELOG note. The users admin's
  role field keeps reading its options directly. `deps` holds no roles; `createDeps` stops returning
  them. The signed-in user's own roles stay in the browser's copy of the user on purpose.
- A server-only `@app/deps/server` binding is not needed yet; add it, following Kenstack's
  `admin`/`admin/server` split, when the first genuinely server-only value appears.
- `docs/site-anatomy.md` and the Unreleased "Host deps binding" CHANGELOG note describe this in place of
  "Client components read `deps`, so keep the module browser-safe". Every place that binds `@app/deps`
  also binds `@app/roles` (Kenstack's `mocks/app` and `tsconfig.json`, payments' and Civic's
  `tsconfig.json`).
- Later, separately: sites letting users choose a time zone could carry it in the browser's user info;
  event times stay in the venue's zone, and cached public pages use the site or venue zone.

## Build plan

Units in dependency order. Each unit is built, checked and reviewed on its own, with TypeScript and
lint in every affected repository. Payments (`payments/`) consumes Kenstack: each unit checks its
callers there and coordinates with the payments session before changing them. Civic's changes for a
unit land with it; Osprey and Agate Springs adopt at their next Kenstack upgrade. Everything touched
sits in CHANGELOG's one Unreleased section, so existing notes are rewritten rather than new break
notes added.

1. **Small independent fixes.** Saves, deletes and reorders clear the module-name tag, and sites drop
   their self-listings. `StepFlow` awaits `io()`, and membership drops `connection()`. Admin list title
   cell and Published/Draft column. `uploadMedia` action-name defaults. `formatDateKey` site default. The `useConsumedSearchParam` bug fix (pass `null` to `replaceState`).
   CHANGELOG: the Published/Draft column note; the StepFlow note goes.
   Checks: save-cache and StepFlow tests; a public page updates after an admin save; admin lists with
   default and custom columns and a non-publishable module; membership renders without
   `connection()`; the TMDB artwork import.
2. **Roles import.** Restore `@app/roles` with Kenstack's default list and Civic's one-line re-export;
   `createDeps` drops `roles`; admin and server code import `@app/roles`; docs and the CHANGELOG note
   describe it. Checks: users admin role picker and role filter; no public page bundle contains the
   role list.
3. **Data cache.** `StepFlow` and the admin sidebar render `QueryProvider`; Civic drops its inner
   wrappers and keeps one at membership and private screenings.
   Checks: `/login` makes one `load-details` request after sign-in; membership and private
   screenings still read account details above the flow.
4. **reCAPTCHA token.** The stage reads it from the raw body; Kenstack's and Civic's schema fields go;
   payments' hold action coordinated. CHANGELOG: rewrite "Pipeline stages as actions".
   Checks: existing auth and pipeline tests, including token rejection and quota order. No browser
   submits, which would send real email.
5. **Mailer sender default.** Callers drop their lookups and checks; payments' coordinated.
   Checks: existing mail tests; a missing sender returns a failed delivery.
6. **Query builder.** First, type fixtures for the real `listQuery` and `pageQuery` wrappers (with
   and without SEO fields, and their existing `joins` callback) and the session-based current-user
   query; adopt only when they pass. Then the builder, the wrappers on it, and Civic's movie page and
   hand-written joined visibility conditions on it.
   Checks: the fixtures; publication, Draft Mode and cache lifetime unchanged.
7. **Users module**, in four steps:
   - a. Rename `fieldServers` to `serverFields` everywhere, alone, so later diffs stay readable.
     CHANGELOG note. Checks: every repository compiles.
   - b. The types spike, then `defineUsersModule` with `currentUser.select` (on the query builder) and
     `publicUser`. Kenstack's base users module and Civic's move to it; Civic's client config composes
     Kenstack's; `loadAccountDetails` picks from the current user; `requireAccountUser` becomes
     `requireUser`. Checks: current-user tests; server-only fields absent from the browser's user
     info; `/account` pages and the admin users list.
   - c. Sign-in settings on the users module; Kenstack's final destination step; Civic's `LoginReturn`,
     landing-rule copies and the password form's `path` go. CHANGELOG: rewrite "Login Destination",
     "Reset Password Path" and the final-step line. Checks: standalone `/login` and sign-in inside
     membership; the forgot-password link's destination.
   - d. `saveModuleRecord` takes its fields from the validated values. CHANGELOG note.
     Checks: save-details, volunteer and field-lifecycle tests; a partial save keeps other values.
8. **Site settings extension.** Show Ken the extension shape first. Then Kenstack's module and loader,
   Civic on them; its loader and metadata copy go. CHANGELOG note. Checks: base and extended settings,
   no-row defaults, sharing image and metadata; `drizzle generate` shows no migration.
9. **Sign-in refresh and account links.** After 7c. Kenstack fires `router.refresh()` after every
   in-flow sign-in; `/login` stops redirecting signed-in visitors on the server; `StepFlow` keeps the
   visit's starting step list in its store; `AccountLinks` is the inline
   presentation of `AccountMenu`'s server-side links, and Civic drops its copy; docs and the CHANGELOG
   note rewritten. Checks: Astra's browser smoke test in the account-links ruling; phone width.
10. **Admin Dashboard link.** Top-level registry links, exact `/admin` matching, Civic's Dashboard as
    a registry link. CHANGELOG: `AdminSidebarNavLink`'s `exact` removed. Checks: Dashboard lit only at
    `/admin`, not on a nested admin page.
11. **Style guide opt-in.** Kenstack's page; Civic's route becomes the stub. CHANGELOG: rewrite
    "Automatic Admin Style-Guide Route". Checks: all three contexts in development, and the admin and
    development-only gates.
12. **Confirm identity on submit**, `06-reauthentication-on-submit.md`, reviewed separately. It follows
    unit 7c because both change Civic's login and profile pages and the auth route; its `EmailChange`
    server entry and account binding build on the users-module work. It removes the login page's
    stale-session branch, and `/account` stays out of the proxy until its public email-change page
    exists.

### Build lanes

Isolated units can run in parallel, each in its own git worktree, merged one at a time with checks
rerun after each merge. Units that touch the same files stay in one ordered lane.

- **Parallel from the start:** unit 1's pieces, 2 (roles import), 3 (data cache), 4 (reCAPTCHA), 5
  (mailer), 10 (Dashboard link) and 11 (style guide).
- **One ordered lane:** 6 (query builder) → 7a (`serverFields` rename) → 7b (users module) → 7c
  (sign-in settings) → 7d (saves) → 8 (site settings, after Ken approves its shape).
- **After 7c:** 9 (sign-in refresh and account links), then 12 (confirm identity on submit).
- Overlaps to watch: 1, 3 and 9 all touch `StepFlow`; 2, 7b and 7d all touch the users module; merge
  them in plan order.
- Review: Opus and Astra review each unit. Astra runs the browser smoke tests and any computer control.
  No real email is sent; Ken enters any sign-in code himself. Nothing is staged or committed unless
  Ken asks. Any Ask-first item stops the lane and comes back to Ken.

Site-only fixes land with the unit they depend on (the `requireUser` swap with 7b, membership's
`connection()` with 1) or on their own.

## Site-only fixes, no decision needed

- Drop the password page's own sign-in check; the password form already does it.
- Remove `/reset-password` from `src/proxy.ts`, which Civic does not serve. Add `/account` only after
  the email-change cancel link leaves `/account` (`06-reauthentication-on-submit.md`).
- Give the admin screenings page `pageRoute` with `access: "admin"` and its search schema, keeping its
  filter fallback and paging. Its data loader already checks admin access, so this is consistency, not
  a security fix.
- Let the news page pass `cacheTags` to `pageQuery` instead of setting them by hand.
- Build `emptyAccountDetails` with `createDefaultValues` over the account-details fields only.
- Register `ShowtimeScheduler` through `defineFormFields`, as video rentals does for editions, keeping
  the showtimes launch gate.
- Remove the concessions query's `staleTime`, which repeats the default.
- The account-details form replaces `Form`'s built-in submit with a `mutationFn` that repeats the
  form's path, only to run a follow-up after the save. Use `Form`'s existing `onSubmit` with the
  built-in submit instead (as the password form does); ask for a Kenstack change only if the
  follow-up's error cannot then show in the form's status line. Kenstack's page-settings form repeats
  its path the same way; check it too.
- Remove the login page's filter for `/login/…` return paths, which no longer exist.

## Cleanup queue — after Astra's smoke tests

From the 29 September 2026 Opus cleanup sweep. Start only once the smoke tests finish; Opus and
Astra review the result.

- Proven or near-proven, apply:
  - `sendCode.ts`: drop the dead `authorization` result (internal file); `extendAuthorization` then
    returns only `authorizedUntil`.
  - `email/change/api.tsx`: `config.linkPath` is a pure alias now that `linkPath` is required.
  - The confirmation sign-in's account id reuses `protectedAccountSchema.shape.userId` instead of three
    copies of `z.number().int().positive()`.
  - `refuseChangedAccount`: drop the second `normalizeEmail` on already-normalized schema output.
  - `ResetPassword/Loader.tsx` and `forgotPassword`: use `getReauthenticationPath` instead of building
    the login URL by hand.
  - Civic volunteer save: drop `changes`, which equals the owner's default.
  - Civic `/login` `Flow.tsx` and `page.tsx`: drop the unread `returnTo` search-param type.
  - Civic admin screenings: replace `z.custom<string | string[]>()` with a checked union.
  - One-use bindings in `state.ts`, `user.ts`, `verifyLink.ts`, Civic `Flow.tsx` and the profile page,
    where the result reads as clearly.
- After the presentation, recheck in a real browser: on `/login`, a sign-in by emailed link in a new tab
  should move the first tab on when it's returned to (Astra's round 3 saw it stay on the code form
  until reload, but switched tabs through the browser API, which may not fire focus or visibility
  events). Also redo the password page idle test with no recompiles.
- Ken's spot check: `auth/server/user.ts` `loadUserByTokenHash` split its one `.where(and(…))` into three
  `.where()` calls when it moved onto the query builder. Equivalent, but churn; put back the single
  `.where(and(…))`.
- From Fable's final review of fixes 12–14: `Login/ReturnStep/LoginReturn.tsx:58-73`'s `user-info`
  query retries three times (~7 s of blank placeholder) before "Continue" shows when it fails; set
  `retry: false` on it.
- From the Sol 6.1 sweep, 29 September 2026 (no blocking defects found):
  - Civic `privateScreenings/notifications.tsx:261`: inline the `renderScreeningEmail` relay at its two
    callers.
  - `reauthentication/FormClient.tsx:87`: drop the unused `message?: string` from `track`'s constraint.
  - `db/queries/page.ts:65,73` and `modules/siteSettings/queries.ts:24`: one-use `[page]`/`[row]`
    bindings.
  - Judgment, not a clear paraphrase: `siteSettings/queries.ts:12`'s comment says why the loader reads
    the registered module; keep unless it reads as noise.
- Needs a check first: `ClientInput` restating `defineClient`'s parameter; the `openingRef` effect in
  `reauthentication/FormClient.tsx`; the `: ListItems` annotation beside two `satisfies` in
  `admin/List/List.tsx`; `email`/`userId` optional independently in the email-login schema.
- Decided (Ken's standing rules settle them):
  - Admin screenings keeps the page's `access: "admin"` gate; its loader's `requireUser("admin")` goes
    (gate once, outermost).
  - `buildClient` and `ClientInput` move out of the public entry file into an internal one.
  - `useReauthenticationAccount`'s `mode` switch goes if its reload check is proven unconditional.
  - `refuseChangedAccount`, a name from this work, becomes a `require…` name under `docs/naming.md`.
  - `defineSiteSettingsModule` gets no table constraint; a missing base column already errors loudly.
  - Ruled by Ken: `currentUser.select` takes a plain object, not a function, so option order stops
    mattering; the "declare `currentUser` first" doc rule goes.
  - Ruled by Ken: rename `getReauthenticationPath` to `getLoginReturnPath` (it builds the sign-in-and-return
    link); CHANGELOG note if a site imports it.
  - `Login/Step/Controller.tsx`: `keepsStepForLink` becomes
    `startedWithLinkSignedIn && handledToken !== linkToken` if review confirms the two agree wherever
    the effect reads them.
  - The mailer keeps turning a thrown sender lookup into a logged failed delivery, as it does for a
    failed send, so an email problem never fails the request that sent it.
  - `query.ts` loses both unruled casts, per `tmp/query-builder-casts-spike/` (full tsc clean):
    `.from<PgTable>(this.table)` replaces `as PgTable`, and storing the selection as `SelectedFields`
    with the explicit `Merge<TSelection, TFields>` type argument replaces `as Merge<…>`.
- For Ken:
  - Later, for headless Kenstack: Kenstack should type-check when a site registers no site settings.
- From smoke testing, Ken's general policy: the reCAPTCHA terms always come last, below a form's or
  dialog's buttons. The confirm-identity dialog puts them between the sign-in choices and Cancel / Try
  again, which adds friction. Enforce it where Kenstack renders the notice, so every form follows it,
  and state it in `docs/forms.md`.
- From smoke testing, Ken: the confirm-identity dialog shows "Try again" before the visitor has tried
  anything. It exists to replay after confirming by an emailed link in another tab, so show it only
  once an emailed link has been sent.
- From smoke testing, Ken: after Cancel, the form's notice says "Please confirm your identity to
  continue." with no way to do it. Ken chose the simpler fix: the notice says what was not saved and
  to submit again, for example "Your password wasn't changed. Submit again to confirm your
  identity."; the form's own submit reopens the dialog. No "Try again" action in the notice.
- From smoke testing, diagnosed 29 September 2026:
  - Regression, fix before commit: Back after an in-flow sign-in skips the sign-in step on /donate,
    /take-your-seat and /volunteer. `StepFlow` reuses a saved step list from an earlier unfinished
    visit (up to 24 hours) on a fresh page load, so a visit that once started signed in makes a new
    signed-out visit skip the sign-in step (`StepFlow/context.tsx:179-201`,
    `Login/Step/Controller.tsx:37`). Not a new visit per page load: an emailed sign-in link and
    development reloads are page loads, and must keep position and values. Instead, on mount, a step
    the saved list marks skipped at the start but the server render now shows comes back; the saved
    list can only un-skip on mount. The sign-in refresh is not a mount, so the ruled behaviour stands.
    The browser store stays (Ken, 29 September 2026): dropping it is only worth it if an emailed link
    opened mid-flow could be guaranteed not to lose the visitor's place.
    Smoke-test Back after in-flow sign-in on /donate, /take-your-seat and /volunteer, and an emailed
    link opened mid-flow.
  - `resolveAuthState` (`auth/server/state.ts:78`) reads the verification cookie, then calls
    `new Date()` with no `io()` first, which breaks prerendering on /donate and /take-your-seat while
    a code is pending. Present at HEAD; add `await io()`.
  - The confirm-identity dialog moves focus with an animation frame, which a hidden browser pane never
    runs; focus from `showModal` (`onShow` or `autoFocus`) instead, then recheck in a foreground
    browser.
  - Ruled by Ken: restore the old "Forgot Your Password?" link on the password sign-in. It switches to
    the email sign-in with the users module's `passwordPath` as the return path, so signing in by
    code or link lands on the page to set a new password. The email login is the forgot-password
    path.
  - Footer phone: left as is; the live civictheatre.ca footer shows no phone.
- From smoke testing, Ken: with the dialog open and a code requested, signing in as a different
  account in another tab and pressing "Try again" just closes the dialog; the page still shows the old
  account. 06 requires an account-changed refusal to reload the page and write or send nothing. Likely
  cause, unconfirmed: the replay path uses `useReauthenticationAccount`'s mode whose
  `reloadIfChanged` does nothing; fold the cleanup item removing that mode switch into this fix.
  Smoke-test submit, replay and confirmation after a second-tab account switch.
- Message sweep, 29 September 2026 (Ken asked for every new message to be checked for the same problem):
  - The guard's text (`reauthentication/server.ts:59`) becomes "Nothing was changed. Submit again to
    confirm your identity."; it is what the form shows once the dialog closes. `Form` shows the
    server's message as soon as the refusal arrives, so the fix belongs in that text.
  - Email-change link cancelled with a stale session (`EmailChange/Client.tsx:160-165`): the link is
    already used, so show "Your email wasn't changed. Open the link in the email again to confirm it."
  - Inside the dialog, a refused replay shows the dialog's own line, such as "Not confirmed yet. Enter
    your password or the emailed code.", not the guard text that repeats its title.
  - The dialog's code step (`Login/Form/Code.tsx:49-53`) tells the visitor to come back to this tab
    after opening the link; the button that follows (shown only after a code is sent) reads like "I've
    opened the link".
  - Hide "Use a different email" in the dialog's code step, since its email is read-only.
  - A late email-change code or resend (`email/change/api.tsx:121`) says the request expired, using
    `verificationExpiredMessage`, not "replaced or cancelled".
  - Signed-out `/email-change` with no link shows a "Sign in to change your sign-in email" link to
    `/login?returnTo=/email-change` instead of a bare heading.
  - Hide "Confirming your new email…" while the confirm-identity dialog is open.
  - Missing email sender: onboarding and verification sends say the site's email sender isn't set up,
    not "try again in a moment"; forgot password refuses up front instead of claiming an email went.
  - Unsure it can happen: the volunteer note step's "Choose your volunteer interests before sending."
    gives no way back to interests; if reachable, add one.
- Not cleanup, for review: `listQuery` now runs `joins` after the query is built; confirm the SQL.
- Planned work now due: add `/account` to `src/proxy.ts`, since `/email-change` exists.

## Kenstack doc fix

- The CHANGELOG still gives email-change confirmation links as `?token=`; they use
  `?confirmEmailChange=`. Login links keep `?token=`. That note is also rewritten by
  `06-reauthentication-on-submit.md`, so make the fix there or coordinate.

## Looked at and left alone

- **Records written without a signed-in user:** account creation and public rental reports clear tags by
  hand, which Kenstack's docs prescribe for writes outside module saves; account creation also needs an
  insert-if-absent that `saveRecord` does not fit.
- **Automatic account info after a save:** three forms call `setUserInfo` after a save; Kenstack's own
  sign-in code does the same, and teaching `Form` to act on any `authState` field would tie every form
  to sign-in.
- **Per-account quota:** the volunteer form's per-email limit is Civic's abuse policy using Kenstack's
  quota service; revisit if payments' own limits make a shared stage option worthwhile.
- **Page editor settings mounting themselves:** deferred, 28 September 2026. The page editor may be
  replaced by the Composer (Civic plan 09); decide then. Today every editable page places both
  `PageEditor` and `PageEditorSettings`.
- **Custom admin actions' access:** deferred, 28 September 2026, to per-module admin access (Kenstack
  work queue item 8, waiting for a use case). About 20 Civic admin action stages each declare `access: "admin"`, so a
  forgotten line leaves an action open. Rather than a route-wide role, a module's custom admin actions
  should inherit that module's access, so a grant such as "news and spotlight" covers their actions and
  new actions are protected by default. The one-line route files are required by Next.js and stay.
- **Preview path placeholder:** saves a few characters in two modules.
- **Boilerplate host files:** `deps.ts`, `db/tables.ts` and `db/setup.ts` are documented host
  composition points.
- **Private screenings' second account-details seed:** both are needed, and they cost one database
  read.
- **Site-wide `RecaptchaProvider`:** deliberate, per `kenstack/docs/forms.md`.

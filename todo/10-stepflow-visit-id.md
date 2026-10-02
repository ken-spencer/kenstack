# StepFlow per-tab state and sign-in hand-off

Status: plan, 30 September 2026, on the direction Ken and Review settled (below). Spiked in Civic's
`tmp/stepflow-plan-spike/`: `storage/` (pieces 2 to 4) and `signin/` (the channel and logout). No
product code has changed. Every decision is ruled. Build after `09`, on its code. Line counts are
measured for the storage pieces and estimated from code reading for the rest.

## Ruled (Ken and Review, 30 September 2026)

1. **Emailed sign-in links.** The link tab asks the site's other tabs, over a `BroadcastChannel`, whether
   anyone is waiting on this sign-in. If a tab answers, the link tab signs in and shows "You're signed
   in. Close this tab to continue." The waiting tab moves on when it regains focus, through the existing
   `useUserInfo` focus and visibility check. If nobody answers (another device, or the first tab closed),
   the link tab carries on in place. (Another device or browser is refused by `verifyLink`, as today:
   the failed outcome in the hand-off section.)
2. **Flow state per tab.** It moves from localStorage to sessionStorage, which drops the 24-hour expiry
   and the sharing of values between tabs. Previous visitors' leftovers go when the tab closes.
3. **Resume.** A reload resumes the tab's current step, stored in sessionStorage beside the values. No
   URL writes and no step routes: Kenstack 2450a60's CHANGELOG explains why `history.replaceState`
   under `cacheComponents` was dropped.
4. **No flash for resumers.** StepFlow renders a small inline script first in its own markup. It reads
   this tab's sessionStorage and, only when a later step is saved, sets a marker React doesn't own, so
   CSS hides the flow area until StepFlow shows the saved step. A safety timeout of about a second
   unhides it regardless. Fresh arrivals see step 1 at once, with no spinner.
5. **The same-tab login flash.** Everything decides from the sign-in response. The user info carries
   the account's own details, so the details step decides at once, and /login navigates straight to
   the destination.

Also ruled:

- A used or invalid link while already signed in shows "You're already signed in."
- Logout navigates first and clears identity after, which removes the moment the sign-in step's email
  form shows on a flow page.
- The confirm-identity dialog's new-tab notice and fix 16's timed retries become the same "close this
  tab" pattern, compatible with `09`'s dialog rules. It covers the answered case; when nobody answers,
  the link tab carries on as today.
- Remove the visit id, `$visit` and `useStep().visit` (Ken, 30 September 2026; no other site has it
  yet), with a CHANGELOG note and Civic's one-line change to the details controller.
- Emailed links: the sign-in step's controller verifies the link quietly, with no StepFlow hold (Ken),
  and the sign-in step never comes forward for a link (the hand-off section).

## Design

### Flow state per tab (piece 2)

- `src/hooks/storedState.ts` reads and writes `window.sessionStorage`. Its exports and signatures stay,
  so no flow owner changes (Civic's flows, payments' `Checkout` and `Status`).
- The shared deadline goes, and so does the `storage` event listener, since sessionStorage never
  changes from another tab.
- A finished flow still clears on the next arrival (a reload, a client mount, a kept page shown again,
  a new server render), and a bfcache restore keeps the result on screen.
- Evidence: `storage/harness/storage.test.tsx` (values are per tab, there is no expiry, and a finished
  flow clears), each failing without its mechanism.

### Resume (piece 3)

- The current step becomes a `$step` slice beside the values, in place of the flow's `useState`. It is
  clamped by the completion ledger and by the steps now skipped; a saved step no longer composed falls
  back to step 1.
- A result (the final step) stays in memory only, so an arrival at a finished store starts at step 1
  and never renders the result. When a kept page is hidden, the arrival effect's cleanup drops the
  result; without that, a kept page shown again after a result briefly shows "Thank you" and runs its
  effects (`control-no-result-reset` fails on exactly this).
- Decided: every same-tab arrival resumes (a reload, a menu link, a kept page shown again, Back), not
  only a reload. So a "Donate" menu link mid-flow returns to Payment. Reload-only would still resume a
  page Next kept in memory ("a kept page shown again still resumes" passes on `reload-only`), so its
  behaviour would depend on Next's cache. Reload-only (`storage/variants/reload-only`) adds 16 net
  lines: a navigation-type check in the hydrating render and in the script, and an effect that forgets
  `$step` on every other arrival, which the lint rule `react-hooks/set-state-in-effect` rejects. Making
  kept pages restart too would need a reset on hide, which React's development StrictMode runs right
  after hydration, cancelling the reload's resume there.
- A client-side mount reads sessionStorage in its first render (useSyncExternalStore's client snapshot:
  the render log starts at the saved step), so only hydration needs the script.
- The kept-page reset to step 1 (`firstStepRef`, its effects) goes. O-1's kept page, shown again after
  the account menu's Logout, resumes clamped to the sign-in step (checked with the real login and
  details controllers, `storage/harness/donate.test.tsx`).

### No flash for resumers (piece 4)

- `Client.tsx` renders a `<script>` as the flow region's first child, only before hydration. Its source
  comes from a small internal builder beside the context (378 bytes for `/donate`). It sets
  `data-resuming` on the region only when this tab saved another step of an unfinished flow, and
  removes it after a second.
- The region carries `suppressHydrationWarning` and the Tailwind class `data-resuming:invisible`, so no
  site CSS changes; Civic's Tailwind scans Kenstack's files and compiles it. A layout effect removes the
  marker on the first hydrated commit.
- Decided, the marker sits on StepFlow's own region, not on `<html>`. The `<html>` attribute logs a
  hydration error with Civic's root layout unless every site adds `suppressHydrationWarning` there, and
  Next's StrictMode remount in development clears script-set attributes on `<html>`
  (`preventing-flash-before-hydration.md`). A `<style>` injected into the head also hydrates cleanly.
- Evidence (`storage/harness/script.test.tsx`, `markers.test.tsx`, React 19.3's dev build with and
  without StrictMode, real Tailwind output):
  - The region is hidden after parsing, and hydration logs no error.
  - The marker goes when the heading reads the saved step.
  - The timeout unhides the region between 0.6 and 1.1 seconds.
  - A fresh arrival never sets it.
  - A client mount renders no script.
- CSP: the inline script will need a nonce once the site sends a Content Security Policy.

### The sign-in hand-off (piece 1)

- Links keep landing where they do today: a flow page, /login, and confirm identity through /login.
  Each is a flow with a sign-in step. Sites that render Kenstack's standalone Login outside a flow keep
  the same verification in that component, through the same code the controller uses.
- Standalone Login's waiting code form also moves on at focus, with no account menu on the page: it
  reloads user info on focus and visibility, adopts a sign-in made elsewhere, and goes to the page's
  `returnTo` or the account's login destination, as its own sign-in would. With no seed, such a page
  has no rendered account under `09`, so it adopts the sign-in as a page rendered signed out does.
- The login step's controller verifies. It already runs on every step, even while the step is hidden.
  It reads the `token` from the address, verifies it quietly, and asks on a `kenstack-sign-in` channel
  (a new internal `Login/Form/signInChannel.ts`) as verification starts. It collects answers until
  verification finishes or for 200 ms, whichever is later.
- StepFlow does not hold for a link (Ken): a signed-out visitor can't reach the steps after sign-in
  until signed in, and a link that signs in another account is `09`'s account-changed case. Before
  sign-in, only seat and date holds act meanwhile, which extend the same visitor's hold: activity is
  presence (Review).
- The address is the link's state. The token stays there until the link settles (signed in, or
  failed once its dialog closes or a new link is requested; an answered link keeps it), so a reload in
  that moment verifies again. It leaves the address whenever the flow's page shows the link settled, so
  a page left mid-check and shown again by Back lets go of it too. Meanwhile the sign-in step shows
  "Signing you in…" in place of its form, which mounts once the link has settled since it would consume
  the token, and /login's return step does not navigate. On /login a signed-in confirmation arrival
  hydrates with the return step active; without this it would navigate before the link is verified.
- Controllers mount only after hydration on every load (they render nothing on the server, so this
  causes no mismatch), so none acts before the flow has resumed the tab's step.
- What both tabs share: the link carries only its token, and `verify-email-login-link` returns
  `{ authState, path }`, so the verified email is the only common fact. The messages are
  `{ type: "ask", id }` and `{ type: "waiting", id, email }`, with no token, challenge key or code.
  Same-origin tabs can already read that email from user info.
- A waiting tab answers while its code form is on screen (`Code.tsx`), and moves on at focus through the
  existing check. Under `09`'s store rule, a page rendered signed out adopts the sign-in silently, and a
  confirmation signs in as the page's own account.
- The outcomes:
  - Answered with a matching email: a dialog, "You're signed in. Close this tab to continue.", with no
    close button. User info and the flow are left alone.
  - Unanswered: the link verified in the browser that asked for it, and no tab answered (the same
    tab, or the first tab closed). `setUserInfo`, and the flow carries on, resuming this tab's step,
    or starting at step 1 in a new tab, signed in. Another device or browser is still refused by
    `verifyLink`, as today, which is the failed outcome below.
  - Failed (used, expired, or opened in another browser): a dialog with Close, "You're already signed
    in." when signed in, otherwise the server's message for the code (expired, invalid, wrong-browser,
    in `auth/email/login/api.ts`). Decided (Ken): the wrong-browser message becomes "Sign-in links
    only work in the browser that requested them. To sign in here, request a new link." Signed out,
    that dialog also has "Request a new link", which swaps the message for the email sign-in form in
    place, so it works on every flow. Standalone Login shows the message beside its email form. Today
    a signed-in visit shows "This sign-in link is no longer valid…" with the email form, and the step
    keeps returning.
    On failure the destination drops `identityConfirmed`, so a failed confirmation link never shows
    "You're confirmed".
- The sign-in step never comes forward for a link. That removes the bring-forward, `keepsStepForLink`
  and `startedWithLinkSignedIn` from the controller, `linkVerification.ts`, `createLoginStep`'s
  `hasLinkToken`, and the form's token plumbing. StepFlow needs no out-of-order exception.
- Confirm identity: the link lands on /login signed in. Answered, the waiting tab replays at focus.
  Unanswered, /login's flow skips sign-in and its return step goes to the page, where today's notice
  shows. `09`'s two `confirmed` senders stay as `09` plans them.
- Evidence: the earlier spike proved the channel, answered and unanswered, with the form verifying
  (`signin/harness/tabs.test.tsx`: the link tab never reaches Payment and the waiting tab reaches it on
  focus; two waiting tabs both move on; unanswered, another email or an answer 400 ms late carries on).
  Moving verification into the controller is from code reading.

### The login flash (piece 5)

- The code and link verification responses already carry the new auth state and the destination
  (`path`). On /login the form sends /login itself as its `returnTo`, which the server rejects, so
  `path` is the account's default destination and the page's own `returnTo` has to win: the
  destination is `returnTo ?? path`.
- The user-info store keeps the account's login destination with the user info: `path` from a sign-in
  response, and `loginDestination` from a user-info response (`auth/api/index.ts` already returns it;
  `loadUserInfo` drops it today) or from a save's `userInfo`. So a /login page that adopts a sign-in made in another tab also has a
  destination, with no lookup.
- Civic's users module `publicUser` adds the account's own details (the details-step fields: name,
  address, phone) to the user info. They go only to that signed-in person, as name and email do. The
  user info must stay per request and never enter a shared cache.
- The details step decides its skip from the user info against its own `addressRequired` and
  `phoneRequired`, and its form fills from the user info. Its save answers with the server's
  `loadUserInfo()`, whose `userInfo` Kenstack `Form` adopts just before the step's `onSuccess` (Ken),
  so the next decision sees the saved details and `next()` lands in the same render. A same-account
  server render does not update the store (`useUserInfo.ts`), so every writer of details answers that
  way: the profile, the details step and the membership sign-up.
- On success the code form stays pending and calls `setUserInfo` and `next()` in one handler. The
  details controller's skip is a layout effect in the same commit, so the flow lands on the right step
  before paint.
- On /login, when the next step is the final return step, it navigates at once to the destination, and
  StepFlow keeps the step before it on screen (the sign-in or details step) while the final step leaves,
  through the same internal hold. There is no "Signed in" screen and no lookup. A signed-in arrival uses
  the destination the server resolves when it renders the step.
- Accepted (Review, 30 September): an account created on /login's details step learns its destination
  from the login step's server refresh, one round trip, with the details step on screen and pending
  meanwhile. Carrying the destination in `create-account`'s response would add Kenstack surface.
- The return step keeps a session-loss guard. `09` keeps account A in the store when a check finds no
  session or another account, so the sign-in and details steps stay skipped; navigating on would bounce
  between /login and a page that needs a session. When `09` has found a mismatch or session loss, the
  return step doesn't navigate and shows `09`'s refusal line ("Your sign-in changed in another tab.
  Nothing here was saved. Reload the page to continue.") with Reload; the account menu's dialog
  already opens, so it shows no second dialog. It waits for the store's check to settle before it
  navigates, never in the same commit. Successful sign-ins still navigate straight from their
  response.
- `09`'s `save-details` and `create-account` callers choose the path from `useUserInfo()` instead of
  `useAccountDetails().userId`.
- Goes, in Civic: `loadAccountDetails`, `dehydrateAccountDetails`, `useAccountDetails`,
  `writeAccountDetails`, the query key, the `load-details` action, the `HydrationBoundary` wrappers in
  the details step and on the membership and private-screenings pages, and the pulse.
  - Client readers switch to the user info: the details step, the membership sign-up (its two
    `useAccountDetails` calls, `writeAccountDetails`, and its loading, error and retry states) and the
    private-screenings request forms.
  - Server readers read the details from the auth state (`loadPublicAuthState`): the profile page, the
    account dashboard, the advertise page and the details step's server `skipped`. Where a form mounts,
    `fillAddressDefaults` supplies the default country and region, as `loadAccountDetails` did.
- Goes, in Kenstack: LoginReturn's user-info lookup, placeholder and retry button. Its reload when the
  server no longer sees the session becomes the guard above.
- The details reach `useUserInfo()` typed through the existing `defineUsersModule` options, with no
  new Kenstack type (`tmp/publicuser-typecheck/`: a Civic `publicUser` with the details type-checks;
  the same probe against today's modules fails). The signed-in auth state gains the seven details
  fields as required, so Civic's test files that build a signed-in state need them.

### Logout

- `logoutUser()` no longer clears the store before its request or restores it on failure, so the
  flow never shows the email form. `LogoutButton` is unchanged.
- Decided: the account menu adopts the pending logout once the pathname differs from where it started,
  so it shows signed out in the same commit as the home page. Without it, the home page shows the old
  menu until the refresh lands. On `/` itself the pathname does not change, so the menu waits for the
  refresh there.
- `usePathname` stays in the account menu, not in `useUserInfo`. Every consumer of the shared hook would
  otherwise read the pathname, and under `cacheComponents` `usePathname` suspends while prerendering
  routes with unknown dynamic params, failing the build outside Suspense (`use-pathname.md`).
- Under `09`: the pending logout sets `09`'s rendered account to none when it is adopted, and a
  user-info reload or server render showing that logout before then also counts as the tab's own. This
  changes `09`'s rule that `logoutUser`'s immediate sign-out and its restore are the tab's own writes,
  since those writes go.
- Evidence: `signin/out/tabs-logout-pathname-logout-layout.txt`, against `plan-storage`, which shows the
  home page with the old menu until the refresh.

### Confirm identity

- The confirmation's code form answers the hand-off, and the waiting tab replays at focus through the
  existing `Code.tsx` listener. `09` already removes fix 16's timed retries; this piece builds on its
  code.
- Decided: when nobody answers, the link tab keeps today's notice ("You're confirmed, but nothing has
  been saved yet…"), since carrying on in place means as today; the answered case shows "close this
  tab" and never navigates. This keeps `identityConfirmed` for that case, at no cost against today's
  or `09`'s code.
- `09`'s two `confirmed` senders and its `saved` message stay as `09` plans them. In the answered case
  the link tab shows the dialog and never lands on the page, so the link-tab sender does not fire; when
  nobody answers it does, and another tab's dialog may be on the email or password screen with no focus
  listener.

## Line count

The storage and logout parts are measured on spike prototypes against Kenstack `5a6caf4` and Civic
`a59b906` (`storage/out/numstat.txt`, `signin/out/numstat-layers.txt`); the rest are estimates from
code reading.

| Part                                    | Added | Removed |   Net |
| --------------------------------------- | ----: | ------: | ----: |
| 2. sessionStorage, no expiry            |    26 |      89 |   −63 |
| 3. Resume                               |    26 |      20 |    +6 |
| 3b. Drop `$visit` (ruled)               |    18 |      51 |   −33 |
| 4. Inline script                        |    57 |       7 |   +50 |
| 1. Hand-off, verifier in the controller |  ~145 |     ~95 |  ~+50 |
| Logout, with the menu fix               |    24 |       4 |   +20 |
| 5. Lean B, estimated from code reading  |  ~150 |    ~300 | ~−150 |

- The storage parts were measured in layers; the logout part on the sign-in spike's `plan-storage`,
  with the pathname read in `useUserInfo` rather than the menu as ruled (a similar size). No
  variant combines every part, so any total is a sum of parts, not a measured or tested whole.
- The sign-in parts are measured or estimated against code from before `09`. `09` removes fix 16 and
  rewrites `useUserInfo.ts`, `continuation.ts`, `Code.tsx` and `FormClient.tsx`, so the confirm-identity row
  (fix 16's removal) belongs to `09` and is left out here.
- The hand-off and lean B are estimates from code reading, not prototypes. The hand-off moves about 110
  lines of the form's link handling into shared code, which are not counted. Lean B is Civic about +50
  −240 and Kenstack about +100 −60 (the spike's /login hold alone measured +108 −16, so the Kenstack
  side is the least certain).
- Summed, about 445 added and 560 removed, net about −115: storage (measured, +123 −163), hand-off,
  logout (measured, +24 −4) and lean B. A sum of parts, not a built whole.
- It is a net simplification by that estimate, mostly from the account-details query path: what goes
  is the expiry and cross-tab machinery, the kept-page reset, the visit id, the details query path and
  the sign-in step's link handling; what comes is the channel, the verifier's outcomes and the script.
- What goes, by name:
  - `readStoreDeadline`, `getStorageDeadlineKey`, the `$expiresAt` key and its write, the stale-store
    clear, the deadline checks, and the `storage` listener with `isRelevant`.
  - `firstStepRef` and the kept-page reset.
  - `visitSchema`, `$visit`, `startVisit`, and `visit` in the context and in `useStep()`.
  - The sign-in step's link handling: the bring-forward, `keepsStepForLink`, `startedWithLinkSignedIn`,
    `linkVerification.ts`, `hasLinkToken` and the form's token plumbing.
  - The account-details query path (piece 5 above), LoginReturn's lookup and placeholder, the pulse,
    and the details-form flash.
- What comes: `signInChannel.ts` (57 lines), the resume script builder and `getStorageKey`'s export, the
  `$step` slice, Civic's `publicUser` details, and StepFlow's hold while the final step leaves.

## Surface

- The user info carries Civic's details through the existing `publicUser` hook, typed with no new
  Kenstack type.
- StepFlow's hold while the final step leaves is an internal hook in `StepFlow/context.tsx`, used only
  by Kenstack's return step; no site calls it.
- `useStep().visit` goes (ruled): a committed public field Civic's details controller reads, with a
  CHANGELOG note.
- `storedState` keeps its exports but changes its documented contract (per tab, no 24-hour lifetime):
  a CHANGELOG entry.
- `createLoginStep` loses its `hasLinkToken` option: a CHANGELOG note.
- New internal exports only otherwise: `askWaitingTabs`, `useAnswerSignInAsks`, the hold hook, the
  script builder and `getStorageKey`.
- StepFlow's region gains a `<script>` first child before hydration and `suppressHydrationWarning`. A
  site rule on `.step-flow > :first-child` would match the script until hydration; Civic has none.
- Civic changes the users module (`publicUser`), the details step, its save's response, and the other
  readers of account details (piece 5), plus the details controller's one line for the visit id.
- New wording: "You're signed in. Close this tab to continue." (also for confirmations), "You're
  already signed in.", and the wrong-browser message with its "Request a new link" button.

## Notes for other owners

- Payments: separate tabs now each mint their own checkout request id
  (`payments/src/checkout/Checkout.tsx`). Orders are saved only at the first Pay, so two orders result
  only if the visitor pays in both tabs; a duplicated tab copies the id; the comment "Choices changed
  in another tab" goes partly stale.
- Browsers restore a tab's sessionStorage on Reopen Closed Tab and session restore (known behaviour, not
  verified here), so a reopened tab's leftovers come back with it.

## Needs a real browser or device

- Paint: no frame of step 1 before the resumed step, including a kept page shown again (a layout effect
  moves it), and the script running before React reveals a streamed Suspense segment. React does not
  server-render hidden Activity children, so a resumed step is drawn after hydration: check that its
  content, not its "Loading this step" fallback, shows when the marker goes.
- A production build with the account menu's `usePathname`.
- Stripe's 3-D Secure round trip keeping sessionStorage in the same tab.
- sessionStorage copying on Duplicate Tab, `target=_blank`, `window.open` and webmail links.
- Whether a background tab answers the hand-off on iOS Safari and Android Chrome, whether Android Custom
  Tabs reach the channel, whether focus and visibility fire on a mobile tab switch, and which tab a phone
  shows after "Close this tab".
- Hydration time on a slow phone against the one-second timeout.

## Build order

1. Flow state per tab, resume, the inline script and removing the visit id (pieces 2 to 4), together
   with the controller's link verification (controllers mount only after hydration), and the
   unanswered and failed outcomes. Per-tab state alone breaks
   a link opened in a new tab on a flow, since the sign-in step can't be reached there.
2. The login flash (piece 5): `publicUser` details, the details step from the user info, the code
   form's decision, and the return step's navigation.
3. The hand-off's channel and the answered dialog, and standalone Login's waiting form moving on at
   focus.
4. Confirm identity: the confirmation's code form answers the hand-off; keep the notice for the
   unanswered case, and drop `identityConfirmed` from a failed link's destination.
5. Logout order and the menu fix.
6. Docs and tests:
   - `docs/step-flow.md`: "every visit enters at the first step", skip overrides per visit, the arrival
     definition, the 24-hour lifetime, "browser Back leaves the transaction", and the emailed link
     bringing its step forward; and the rule that account details reach the browser only through a
     query keyed by user (the user info is sanctioned for the person's own data, per request, never in a
     shared cache). `docs/auth-routing.md` for the hand-off.
   - CHANGELOG, extending the Unreleased notes as `docs/upgrading.md` asks: "Every visit enters at the
     first step, a refresh included" and "returns to its first step", the `visit` migration step, "An
     emailed sign-in link returns to the flow's URL" with "`LoginController` requires its step and
     brings it forward" (now the controller verifies), `hasLinkToken`, `storedState`'s contract,
     `useStep().visit`, the user info carrying Civic's details, and the migration step saying account
     details "must reach the browser through a client query keyed by user id" with Civic's
     `AccountDetailsStep` as the reference.
   - Tests that pin the old behaviour, under `docs/testing.md`: Kenstack `StepFlow`, `LoginStep`,
     `LoginRedirect`, `LoginForm`; Civic's volunteer "restores committed interests after returning
     from sign-in", which now resumes at sign-in; payments' `CheckoutStatus.test.tsx`, whose
     `{ ...localStorage }` snapshots would pass without testing anything; and the tests that reset
     with `localStorage.clear()` (payments' `HoldController.test.tsx` and nine in Civic), which would
     leak sessionStorage between cases; Civic's account-details query, form, step and save tests,
     which pin the query path; and Civic's test files that build a signed-in auth state, which gain
     the seven details fields.

## Checks

- Two tabs on the same flow keep separate values; nothing expires; a finished flow restarts at step 1.
- A reload, a menu link, and a kept page shown again each resume the tab's step with no frame of step 1
  in a real browser; a fresh tab shows step 1 at once.
- An emailed link with the first tab waiting: the link tab shows the "close this tab" dialog, and the
  first tab moves on at focus. With no waiting tab, the link tab carries on signed in, in the same tab
  at its step and in a new tab at step 1. A used link while signed in says "You're already signed in."
  with Close. The sign-in step never comes forward for a link, and shows "Signing you in…" when it is
  already on screen. /login's return step never navigates before the link is verified. A failed
  confirmation link never shows "You're confirmed". A link opened in
  another browser is refused.
- Standalone Login outside a flow, on a host without the account menu: the waiting code form moves on
  at focus after the link is used in another tab.
- /login after a check found no session or another account: no navigation, and the Reload message.
- A signed-in confirmation link at /login does not navigate before verification.
- In-flow and /login code sign-ins, with complete and incomplete details: the code form stays pending,
  then the right step or the destination, with no pulse, no details-form flash and no "Signed in"
  screen. Also a signed-in arrival at /login and an account created on the details step.
- Logout from a flow page: no email form, and the menu shows signed out with the home page.
- Confirm identity by emailed link in another tab: "close this tab", then the held change saves at
  focus; with the first tab closed, the notice shows.
- The device checks above.

## Rationale (from the 29 September discussion)

The discussion (Kenstack `5a6caf4`, Civic `a59b906`, recordings in Civic's
`tmp/stepflow-discussion-spike/out/`) found these problems; the pieces answer them:

- **O-1, the kept page:** resolved by todo 12. Resume keeps it resolved: a kept page shown again resumes
  clamped to the sign-in step. Its side findings go too: a previous visitor's gift within 24 hours
  (per-tab state) and the email form during Logout (logout order).
- **Reload position:** a reload returned to step 1, one to three clicks back, with the gift form's
  amount switching after hydration. Resume and the inline script return straight to the step with no
  flash.
- **The login flash:** the details pulse, "Signed in" over a placeholder, and sometimes the details
  form for an instant. Deciding from the sign-in response, with the details in the user info, removes
  all three. The earlier options (`tmp/login-flash/fix.diff`, 232 lines; the StepFlow hold, 204; a
  refreshing state on `useUserInfo`, 103 or 227) are superseded.
- **Emailed links opened mid-flow:** the first tab resumed on focus with stale form defaults, and values
  committed in one tab reached the other live. The hand-off makes the link tab say "close this tab" and
  the first tab carry on with its own state. A used link while signed in, which held the step with
  "no longer valid", becomes a short "You're already signed in." dialog.
- **Visits keyed by id** (the original idea): not needed. Per-tab state gives each tab its own store
  without a visible `visit` parameter, a sweep of old stores, or flow owners reading stores by visit.

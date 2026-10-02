# Account change detection

Status: plan, rewritten 30 September 2026 on Ken's simplified design (below). Civic's
`tmp/account-change-spike/` tested the earlier design: its comparison, held-request and import-graph
checks still apply; its refresh and `none` checks do not. No decision remains. The Back assumptions
were verified in a browser on 30 September 2026 (end of file). Queue after `12` is committed.

## Problem

A page keeps showing the account it was rendered for after another tab signs in as someone else, signs
out, or signs in from signed out. The stale tab's next request then runs as the new session's account
while the page still shows the old one. Today only the confirm-identity forms check, each carrying its
rendered account id (`06`'s binding), and Civic's profile save, which sends its own.

Smoke-test evidence, 29 September 2026 (todo 12 round): signing out in another tab left a donation
flow on Payment with the signed-in menu until reload; an emailed sign-in link opened in a new tab left
the first tab on the code form. Tabs were switched through the browser tool's API, which may not fire
focus or visibility events, so recheck with real tab switches.

## Ruled (Ken, 29 and 30 September 2026)

- Server safety net: `fetcher` sends the account the page was rendered for, and every access-checked
  pipeline compares it with the session. Pages rendered signed out are never compared, and
  `create-account` refuses when a full session exists. On a mismatch the API writes nothing and
  answers `account-changed`.
- No `router.refresh()` and no form reset on a mismatch. The refused form's status line shows "Your
  sign-in changed in another tab. Nothing here was saved. Reload the page to continue." with a Reload
  action. The person reloads when ready and can copy anything they typed first.
- Proactive notice: when a page rendered for an account (A) sees a different account (B) or none
  through the user-info focus and visibility check, the account menu opens a dialog: title "Your
  sign-in changed", body "You signed in or out in another tab. Reload the page to continue.", buttons
  Reload and Close. Close dismisses it until the account changes again. No per-page markup and no
  polling.
- A page rendered signed out that later sees a sign-in, from another tab or an emailed link, is the
  expected outcome, not a change: the store adopts it silently, with no dialog, so the flow carries on
  as it does today.
- Session loss on submit keeps "You must be signed in to perform this action."
- The rendered account comes from the server render and changes only on a same-tab sign-in or
  sign-out, never from the focus check.
- It replaces `06`'s per-form account binding, which goes: the `userId` in the login schemas,
  `requireUnchangedAccount` and `useReauthenticationAccount`. Request plumbing does not belong in a
  schema, as with the reCAPTCHA token.
- A confirmation's code request sends `confirmation: true`, which keeps the promise that "Email me a
  code" always sends a code.
- Logout stays as it is today, with no full page load: a same-tab switch followed by Back settled on
  the new account's page (the last section). The server comparison is the guarantee for a page Back
  restores after another tab's change.
- No Server Actions for auth: after a deploy changes the build ID, a Server Action can fail (a logout
  button that stops working), so auth stays on route handlers.
- Derived from the correction, for Ken to see: a sign-in that a page rendered signed out adopts
  becomes that page's rendered account, so from then on the page is compared. This departs from
  "pages rendered signed out are never compared" and "never from the focus check" above. Left at
  `none`, the page would adopt a later switch to yet another account silently too, with the first
  account's data on screen.

## Design

### The rendered account

- New internal module `src/auth/renderedAccount.ts`, isomorphic (no directive). It holds the account
  the tab's page was rendered for (the user id, or `none`) and the header name `x-rendered-account`.
  Nothing is set until a server render states an account.
- Set once per document, by the first `useUserInfo(authState)` seed to run in it: `AccountMenu`'s menu
  (every site page through the header, every admin page through the sidebar), `AccountLinks`, or the
  login step's controller. Later seeds leave it: a soft navigation, a route shown again, the refresh
  that follows a same-tab sign-in. After another tab's change, the next navigation loads the page
  afresh (Ken), so a new document follows the current session.
- Changed by this tab's own sign-in or sign-out, through `setUserInfo`, which every sign-in calls, and
  which a completed logout reaches once its page has left, or sooner through a user-info reload or
  server render that shows it (plan 10's Logout). Not for `code-sent`, which changes no session. A save
  that changes the user or session answers with `loadUserInfo()`'s `userInfo`, which Kenstack `Form`
  adopts through `setUserInfo` just before the form's `onSuccess` (Ken); hosts never call
  `setUserInfo`.
- Impersonation today reloads user info (`SwitchUserButton.tsx`, `refreshUserInfo`), which the store
  rule would treat as another tab's change: it would open the dialog and refuse the new account. The
  `impersonate` action (`src/admin/api/impersonate.ts`, which answers `{}` today) returns the new auth
  state, and the button adopts it through `setUserInfo`, then ends as logout does, with
  `router.push("/")` and `router.refresh()` (`LogoutButton.tsx`), so the same-tab Back result in the
  last section covers it too.
- Also changed when a page rendered signed out adopts a sign-in (the store section below).
- Never changed otherwise by a user-info reload, except one that shows this tab's completed logout.
- So after another tab's change on a page rendered for an account, every access-checked request in
  this tab is refused until a reload:
  a page restored by Back, and also a page reached by client navigation afterwards, which the server
  renders for the new account but which still sends the tab's account. The dialog asks for that reload.
- A document whose pages have no seed (Civic's POS) sends no header and is never compared, as today.
- No import cycle: `useUserInfo` → `fetcher` → `renderedAccount`, and `useUserInfo` →
  `renderedAccount`; `renderedAccount` imports only a type (spike `checks/importGraph.mjs`).

### The user-info store

- `setUserInfo` (this tab's own sign-in or sign-out) sets the store as today. A completed logout is
  adopted by the account menu once the page it started on has left, and a user-info reload or server
  render that shows it sooner is this tab's own too (plan 10's Logout). Every other update, a user-info reload or a later seed, depends on how the page was rendered:
  - Rendered signed out: adopted silently, as today. A sign-in from another tab or an emailed link is
    the expected outcome there, so the flow carries on. An adopted sign-in also becomes the rendered
    account, as a same-tab sign-in does, so from then on the page is compared. Left at `none`, the page
    would adopt a later switch to yet another account silently too, which is the problem this plan
    exists to stop.
  - Rendered for an account: adopted only for that account (the same user id; an email change keeps
    it). Another account, or none, opens the dialog and leaves the store as it is.
- So a page rendered for an account never follows another tab's change. Without this, code that
  follows the store would
  refresh or reset: the login step's controller refreshes when the store shows a new signed-in id and
  skips or brings forward its step (`Login/Step/Controller.tsx`); EmailChange refreshes when the store
  turns signed in on a render without the wrapper (`EmailChange/Client.tsx`); and forms keyed by the
  store remount (EmailChange's email form, payments' `Checkout`, Civic's details step and membership
  sign-up). The account menu keeps showing the account the page was rendered for.
- Todo 10's discussion is working out a larger StepFlow and sign-in piece (a "you're signed in, close
  this tab" page for emailed links, the waiting tab resuming on focus with a refreshing state on
  `useUserInfo`, and session storage for flow state). This plan designs none of it and stays
  compatible: a page rendered signed out adopts a sign-in silently, which is what the waiting tab
  needs, and the plan changes nothing in StepFlow or the flow store. A waiting tab rendered for another
  account shows the dialog instead of resuming; that is a signed-in visitor switching accounts by
  emailed link, and todo 10 already sends a visitor meaning to switch to the account menu.

### The comparison

- One comparison function, called first in the `access` branch of `pipelineStage`
  (`src/api/pipeline.ts`), before `hasAccess`, and by the admin API gate. `multiPipeline` and the admin
  API reach every access-checked stage through the `access` branch.
- It compares only when the header names an account and a session exists. A session for another
  account: `409`, code `account-changed`, "Your sign-in changed in another tab. Nothing here was saved.
  Reload the page to continue.", and the action never runs. No session: the existing `401` "You must
  be signed in to perform this action." No header (a page rendered signed out, or no seed): not
  compared.
- The message says "another tab", but it also shows in two cases where the change came from this tab:
  a `create-account` retry after a lost response, and a confirmation that signs in as another account
  (unreachable in practice).
- APIs that check access by hand move onto `access`, so they are compared without per-route code:
  `reset-password` (`access: "authenticated"`), Civic's `save-naming-details` (as its siblings), and
  payments' `list-orders` and `search-order-customers` (`access: "admin"`, added for the comparison).
  Their other checks stay, including payments' fresh admin check inside the queries: the orders page's
  server render calls `listOrders` behind `pageRoute`'s cached admin gate, and financial history needs
  fresh authorization.
- The video-rental report API is anonymous and records `createdBy` from the session, so a stale tab
  can credit a report to the other account. Attribution only, like the holds; left as is.
- Civic's `save-details` (`src/modules/users/AccountDetailsStep/api/saveDetails.ts`) checks the session
  by hand to choose between updating the signed-in account and creating one for a proven email, so
  today a tab rendered for A saves onto B's account. It splits:
  - `save-details` takes `access: "authenticated"` and is compared.
  - A new anonymous `create-account` serves pages rendered signed out. It creates the account for the
    proven email, and refuses when a full session exists, with `account-changed` and the message. That
    is its own precondition, not a comparison: a session that appeared meanwhile may be another
    account's, and a proven visitor's details must never be written into it. The visitor's own
    account, created in another tab or by a request whose response was lost, is refused the same way.
  - On that refusal its callers reload user info, so the tab adopts the sign-in silently and the step
    shows that account's record, as the next focus would; the flow carries on without a reload.
  - Both callers (the details step and the membership sign-up) already know which applies from
    `useAccountDetails().userId`.
- Civic's `load-details` reads the session's record with no `access`; it takes
  `access: "authenticated"` (its one caller runs signed in), so a stale tab's query never caches
  another account's details under its own account.
- Payments' hold APIs are anonymous, so they are never compared, and they write before checkout
  (`payments/src/holds/api.ts`, `visitor.ts`). A hold belongs to the browser's session, and these
  effects follow the session as on any sign-in, unchanged by this plan:
  - Claiming seats from a stale tab creates a hold for the session's account.
  - The automatic extension (`HoldController.tsx`), run from a tab rendered for A after B signed in,
    deletes A's unpaid hold (a hold an order has taken over is refused instead), and binds an
    anonymous hold to B, as the signed-out exemption allows.
  - Another account's hold is deleted, never transferred, so no account's data moves to another. The
    pay step's quote and payment are compared, so nothing is charged from a stale page, but that
    refusal does not undo a hold already claimed or deleted.
- The admin API gate (`src/admin/api/index.ts`) refuses a non-admin session before any stage runs, so
  it runs the same comparison first, then refuses with a normal `401` or `403`. It stays: stages parse
  their schema before `access`, so without it a non-admin would reach admin validation messages.
- Fix first, a pre-existing bug: that gate answers a non-admin session with `{ redirect: "/login" }`
  and no status, which `fetcher` rejects as an invalid response before its redirect branch. With this
  work an admin tab whose session changed would show that error instead of the message.

### Identity APIs

- `user-info`, logout and every sign-in (password, email code, link) are anonymous stages and ignore
  the header: `user-info` reports whatever session exists (the focus check relies on it), logout ends
  it, and a sign-in ends the current session before starting its own.
- `verify-email-change-link` is access-checked, so a mismatch refuses it without consuming the link; its
  `checkLink` call takes the account from the session (`user.id`), not the body.
- Decided: a confirm-identity sign-in that runs while another tab has signed in as someone else signs
  the browser into the page's account, replacing the other session. The other tab then shows the
  dialog on its next focus, or the message on its next request. Having sign-in stages compare would
  make identity APIs refuse, against the ruling.
- The email login skips sending a code for a recently confirmed session, and excludes confirmations
  today through `userId`. The confirmation's code request sends `confirmation: true` instead, which
  selects the same always-send-code branch (`email/login/api.ts`). It carries confirmation intent, not
  an account.

### The client

- `fetcher` sends the header whenever the page was rendered for an account. It does nothing else with
  an `account-changed` refusal; the caller receives it.
- Kenstack `Form` shows an `account-changed` refusal in its status line with a Reload button, which
  reloads the page. Typed values stay, so the person can copy them first. Queries and hand `fetcher`
  calls show the message where they already show errors.
- Nothing resets on a mismatch, and nothing on a page rendered for an account follows another tab's
  change (the store rule above).

### The sign-in-changed dialog

- The account menu (`Menu` and `Links`, the seeds on every site and admin page) shows the dialog when
  a store update is refused on a page rendered for an account: usually the focus or visibility check,
  or a later seed on a page reached by client navigation, bringing another account or none. A page
  rendered signed out never shows it. The dialog: title "Your sign-in changed",
  body "You signed in or out in another tab. Reload the page to continue.", buttons Reload and Close.
- Close dismisses it for the account the check returned; a later check returning yet another account
  opens it again. A check returning the rendered account again clears it.
- One dialog per tab. Civic's header mounts both `Menu` (desktop) and `Links` (mobile), and a dialog
  portals out of a hidden container, so its state lives beside the user-info store and one mounted
  menu renders it.
- A failed check compares nothing. No polling and no per-page markup; a page without an account menu
  (Civic's POS) gets no dialog.

### The confirm-identity wrapper

- `FormClient`'s page reloads on `account-changed` go. A replay refused with `account-changed` settles
  with that refusal. `confirm` returning another account or none settles what is held with the refusal
  the pipeline would give (the mismatch message, or "You must be signed in…"). Closing the dialog still
  settles with the original refusal. Without the header, a request held for A replays as B today
  (spike `checks/heldAcrossAccounts.test.tsx`); the comparison refuses it.
- The form shows the settling refusal. It already showed the original one, and some callers ignore a
  later error result (`ResetPassword/Form.tsx`), so settling the promise alone leaves "confirm your
  identity" on screen. Those callers (ResetPassword, EmailChange's email and code forms) show it with
  the `setStatusMessage` their `onSubmit` already receives, so the Reload action shows too. `track` is
  documented for hosts, so it gains no parameter. EmailChange's link confirmation and resend already
  show their settled result.
- The confirmation shows and uses the email from the user-info store, not the render. An email change
  completed in another tab keeps the account id, so it opens no dialog; the store brings the new
  address on the next focus. Without this, the code would go to the old address, and on Civic
  redeeming it signs the visitor out (`redeemProof.ts`, the unregistered-address path). The removed
  binding refused this through its email half.
- The wrapper's inner key and EmailChange's email-form key stay. The wrapper's changes only after a
  same-tab sign-in or a reload. EmailChange's follows the store's email, so under the store rule it
  moves only on this tab's own changes and on an email change completed in another tab for the same
  account, which reseeds the form with the new address.
- One `BroadcastChannel`, `kenstack-reauthentication`, kept only for the confirm-identity cross-tab
  items. It is opened in an effect (Node 24 has it globally, so never at module scope) and is available
  in every browser Next 16 targets:
  - `{ type: "confirmed", userId }`, sent after a confirmation in this tab and on mount in the tab an
    emailed link landed in (`identityConfirmed`). A tab holding requests for that account replays them
    visibly ("Continuing…", Cancel hidden). This replaces fix 16's timed retries; the focus check stays
    as the fallback for a tab the browser froze.
  - `{ type: "saved", userId }`, sent when a password reset or an email change completes: the requests
    whose success deletes every session of the account and signs in afresh. The completing forms post
    it themselves (ResetPassword on success, EmailChange's link and code confirmations); it adds no
    member to `useAuthorization`. The wrapper ignores a `saved` posted from its own tab. Email-change
    issuance and resend also succeed through `track` but change nothing, so they send nothing. A tab
    holding requests for that account cancels them with the mismatch message. This does not fully
    settle Fable's older-held-save case: when two tabs each hold a protected save for the account and the patron
    confirms in one, both replay at once, and whichever reaches the server first wins; the other gets
    "You must be signed in…". Accepted (Review, 30 September 2026): it needs two tabs each holding a
    protected save at once, and nothing is written to the wrong account. Its Cancel-during-quiet-check
    case stays on the focus fallback, where reporting the change as saved is true.

### What goes

- `protectedAccountSchema` and the `userId` fields: the three login schemas (with the code schema's
  `email`, which exists only for the check), the email-change schemas (the link schema becomes
  `{ token }`) and reset-password's.
- `requireUnchangedAccount` and its calls in the login handlers and email login.
- `requireRecentAuthentication`'s account parameter and its `account-changed` branch; its callers
  change (reset-password, the email-change actions).
- `useReauthenticationAccount` and its uses in the login form, password and code forms, and the `userId`
  the confirmation sign-in and protected request bodies send (EmailChange, ResetPassword).
- `FormClient`'s page reloads and fix 16's timed retries.
- Civic's save-profile account check: the `userId` the profile form sends and the `409` in
  `profile/api.ts`.
- Stays: `AuthorizationContext.userId` (EmailChange uses it to know it is inside the wrapper) and
  `FormClient`'s `userId` prop.
- Docs: correct the Unreleased "Shared Reauthentication" note in `CHANGELOG.md`, which describes the
  binding (the `userId` sent, `account-changed` reloading the page), rather than adding removal notes
  (`docs/upgrading.md`). Add an Unreleased note for the host-visible change: access-checked stages
  answer `409` `account-changed` on a mismatch, Kenstack `Form` shows it with a Reload action, and host
  APIs that check access by hand should move onto `access`. In `docs/auth-routing.md`, replace the
  confirmation's account binding with the rendered account, the comparison and the dialog.
- Tests that pin the old shape are updated or deleted under `docs/testing.md` (`reauthentication`,
  `ResetPassword`, `LoginForm`, `LoginRedirect`, `Authorization`).

### Requests outside `fetcher`

None needs the header. The same-origin ones only read or set a cookie: the imported-artwork blob fetch
(admin), receipt links (owner or admin) and draft-mode links (admin). Uploads PUT to S3; their presign
and complete steps use `fetcher` and are compared. Stripe.js calls go to Stripe; outcomes reach the app
through compared APIs or the webhook. There are no Server Actions, `sendBeacon`, XHR, EventSource or
WebSockets.

### Next's docs on `router.refresh()`

`useRouter`'s reference says `router.refresh()` clears the client cache "for the current route" only
(`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`, line 46), and the
glossary says pages are reused on Back and Forward. Cookie changes clear it only when made in a Server
Action, and Kenstack sets cookies in route handlers. The browser results in the last section settle
what matters here, and this design never refreshes on a mismatch.

## Build order

1. The admin API gate's refusal (bug fix, on its own).
2. `renderedAccount`, the first-render seed, the store rule, `setUserInfo` adoption (impersonation
   included), `fetcher`'s header, the comparison (pipeline and admin gate) and message, `Form`'s Reload
   action.
3. The sign-in-changed dialog.
4. Hand-checked APIs onto `access` (Kenstack, Civic, payments), Civic's `save-details` split and
   `load-details` access.
5. The confirm-identity wrapper: settling held requests with the right refusal and showing it in the
   form, the store's email in the confirmation, the channel, `confirmation: true`; remove fix 16's
   retries and the page reloads.
6. Remove `06`'s binding and Civic's save-profile check, docs, CHANGELOG and tests.

## Checks

- Second-tab sign-in as another account: returning to the stale tab opens the dialog before any click.
  Close dismisses it. The next access-checked request writes nothing, and the form shows the message
  with Reload; Reload shows the new account. Use real tab switches.
- Second-tab sign-out: the dialog opens, and the next request gets "You must be signed in…".
- Second-tab sign-in on a tab rendered signed out: no dialog. The tab adopts the sign-in on its next
  focus and carries on; a later switch to another account is then compared and opens the dialog.
- After Close, the dialog opens again only when the account changes again. A failed user-info reload
  opens nothing. Civic's site pages show one dialog at mobile and desktop widths.
- Signing in or out in the same tab, inside a flow and standalone, never opens the dialog and is never
  refused (the pay step's first request after an in-flow sign-in included). Impersonation opens no
  dialog.
- After a second-tab change, a page restored by Back, and a page reached by client navigation, are
  both refused with the message until a reload.
- An emailed sign-in link opened in another tab mid-flow: the first tab, rendered signed out, adopts
  the sign-in on its next focus with no dialog and carries on as today.
- The details step as A, B signs in elsewhere: Continue writes nothing and shows the message. A proven
  visitor whose other tab signed in: Continue creates no account and writes nothing, and its refusal
  makes the tab adopt the sign-in and carry on.
- Holds: after B signs in elsewhere, a stale tab's extension deletes A's unpaid hold and never moves
  it to B.
- Confirm identity: a confirmation by emailed link in another tab replays the held change at once; a
  save in another tab cancels the held one with the message; a second-tab account switch refuses the
  replay with the message and keeps the typed values; an email change completed in another tab shows
  the new address in this tab's confirmation after focus; an email-change code sent from another tab
  cancels nothing here; "Email me a code" always sends a code.
- An admin tab whose session became another account shows the message instead of "invalid response".
  A role removed from the same account gets a plain `403`.
- Real browser, Back (as in the last section, now with this plan built):
  - Same tab: A logs out, signs in as B inside a flow, then Back to the profile settles on B's profile.
  - Two tabs: B signs in in tab 2; returning to tab 1 opens the dialog; Back in tab 1 restores A's
    profile and draft, and Save is refused with the message; neither account changes.

## A page restored by Back (verified 30 September 2026)

Browser results on today's code, in `tmp/smoke-back-account/report.md`, verify the earlier
assumptions:

- **Same tab:** A logged out from the menu, signed in as B inside /donate, then pressed Back to
  /account/profile. It settled on B's profile, not A's (after a brief showing of the previous page).
  Ken's ruling: logout stays as it is today, with no full page load. Whether Back refetched by request
  or otherwise was not captured.
- **Two tabs:** B signed in in tab 2. Back in tab 1 restored A's profile with its unsaved draft. Civic's current profile check refused the save, and neither account changed. So the server
  comparison is essential for Back across tabs, and it is the guarantee this plan keeps when Civic's
  check goes.
- **Focus check (Ken's own check in Firefox, not in the report):** returning to tab 1 updated its
  account menu to B, so the focus check fires in a real browser. The page content, an admin page B
  cannot use, stayed, as expected before the dialog is built. With the dialog, Ken considers this
  solved; Reload and Close stay. The report's in-app browser did not show the menu update, and whether
  its tab switch fired a focus event was unverified.
- **Same-tab switches without a logout** (an emailed sign-in link for another account on a flow page,
  and proving an unregistered email while signed in, then `create-account`): recorded as covered,
  following the logout result. Both also end with the login step's refresh after the new sign-in, and
  nothing in this plan points the other way.

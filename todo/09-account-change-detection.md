# Account change detection

Status: proposed by Ken, 29 September 2026, during the host-wiring smoke tests. Not designed in detail
or reviewed. Queue after `07-host-wiring.md` is committed.

## Problem

A page keeps showing the account it was rendered for after another tab signs in as someone else, signs
out, or signs in from signed out. The next request from the stale tab runs as the new session's
account while the page still shows the old one. Smoke testing found one case: with the confirm-identity
dialog open and a code requested, a second-tab switch then "Try again" just closed the dialog. Ken: any
authenticated API call should detect the change and force a refresh with an explanation.

Today only protected forms check, each carrying its rendered account id (`06`'s `userId` binding and
`useReauthenticationAccount`).

## Proposal

Detect in two places, both owned by Kenstack, so no form or site does anything.

1. **Every request states its account (the guarantee).** `@kenstack/api/fetcher`
   (`src/api/fetcher.ts`), which every Kenstack form, the user-info store and site calls already use
   (59 files), sends the account the page was rendered for, the user id or "none", in a request header.
   Only APIs that check access (a signed-in user or a role) compare it: Kenstack's access check in the
   pipeline compares it with the session's account and refuses with the existing `account-changed`
   code, writing nothing. Anonymous APIs ignore it (Ken, 29 September 2026), so sign-in and public
   forms need no exemption. `fetcher` sees that code and reloads the page; the reloaded page shows a short notice such
   as "You signed in as a different account in another tab."
2. **A tab notices when it comes back (the early warning).** The user-info store
   (`src/auth/useUserInfo.ts`) already reloads the signed-in user on focus and visibility change. When
   that reload returns a different account than the one the page was rendered for, reload the page
   straight away, before the visitor clicks anything.

A browser channel between tabs (`BroadcastChannel`) could push the change instantly; optional, since
2 covers the moment the visitor looks at the tab.

The confirm-identity dialog's replay on regaining focus (replacing "I've opened the link") was built
as fix 16 of the host-wiring smoke-test batch; this work can reuse its focus handling. Fix 16 covers
a return before the new tab finishes confirming with a few timed retries (about 2, 5 and 10 seconds);
a `BroadcastChannel` message from the confirming tab would replace them with an exact signal.
The same channel should settle two cases Fable found (29 September 2026): a save made again in the
new tab, after which the first tab's older held save replays and wins; and a Cancel pressed during a
quiet check that then succeeds. A save in any tab should tell the others to drop their held copy.

## Where it lives, for review

- **The rendered account's source.** The user-info store holds it, but `useUserInfo.ts` imports
  `fetcher`, so `fetcher` importing the store makes a cycle. Keep the rendered account in a small
  module both import, set once from the server render (the store's seed), and never from a later
  user-info reload, since that reload is how the change is noticed.
- **Which check.** Find the single place pipeline stages check access (a signed-in user or role) and
  compare there, so every access-checked API gets it and anonymous ones never do. Sign-out and the
  auth API's `user-info` read must not refuse on a mismatch, since they report or end whichever
  session exists.
- **Reload and notice.** A full reload (not `router.refresh()`), since every client value on the page
  belongs to the old account. The notice needs to survive the reload: a short-lived cookie the layout
  reads, or a query parameter Kenstack consumes.
- **Non-`fetcher` requests.** Server actions, `fetch` calls a site writes by hand, and upload
  presigning; list them and decide whether each needs the header.
- **What it replaces.** `06`'s per-form `userId` binding, `refuseChangedAccount` and
  `useReauthenticationAccount` become the general check; remove them rather than keep both. That
  includes the `userId` field the confirmation sign-in adds to three login schemas
  (`auth/schemas/login.ts`, `auth/email/login/schemas.ts` twice): request plumbing does not belong in
  a schema, as with the reCAPTCHA token (Ken, 29 September 2026).

## Checks

- Second-tab sign-in as another account, sign-out, and sign-in from signed out: the stale tab's next
  request writes nothing and reloads with the notice; returning to the stale tab reloads it before any
  click.
- Signing in or out in the same tab still works (exempt requests).
- No reload loop when the user-info reload fails.

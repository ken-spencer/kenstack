# Confirm identity on submit

## Status

Proposed by Ken; reviewed clean by Opus and Astra on 28 September 2026 after nine rounds; not
scheduled yet. Owner: Kenstack (`auth/reauthentication`, the login form's reauthentication mode, the
guard, the email-change handlers and `EmailChange`'s server entry), plus Civic's host upgrade. Rollback is the timer design in commit
`614e8f4`; no flag keeps both.

Sensitive forms, today password change and sign-in email change, render normally. The page asks the
person to confirm their identity only when the server refuses a submit for stale authorization, then
runs the same submit again. Someone who signed in within the window never sees a prompt.

## Behaviour

1. `ReauthenticationForm` stays the server wrapper around a sensitive area and still loads the
   reauthentication login form. Its children always render: no timer and no inline sign-in block.
2. Protected client requests go through `track(() => request)`. When the result carries
   `code: "reauthentication-required"`, the wrapper holds the request function and opens a dialog.
   `track` stays pending, so the form's submit stays disabled.
3. The dialog is titled with the wrapper's `message` and holds the reauthentication login form,
   mounted fresh each time it opens. Focus moves to its first control the person can use, such as the
   password field. The email is the rendered account's and cannot be edited.
4. When the person confirms, the login form calls a confirm callback from the wrapper's context; it no
   longer refreshes the route. The dialog stays open showing progress while the wrapper replays the
   held requests one at a time, each after the previous settles. While a replay runs, the dialog
   refuses every way of closing it, including Escape and a backdrop click, and its controls are
   disabled.
5. A replay refused again for stale authorization stays held, and the dialog shows the refusal. Any
   other result settles that request's `track`, including errors, which the form reports as usual. A
   network failure settles with that failure and is never retried automatically. Once nothing is held
   the dialog closes and focus moves to the first thing the result shows, such as the email-change
   code field or the form's status message.
6. Before any replay starts, Cancel, Escape and closing the dialog settle every held request with its
   original refusal. The form's status line then reads "Please confirm your identity to continue."
   Nothing was written. A confirmation that completes after a cancel replays nothing.
7. The wrapper's account is the one the server rendered it for, never the live user info, which
   follows the cookie. Each protected request and each reauthentication sign-in request names that
   account, and the server refuses a different or changed account with `code: "account-changed"`
   before writing or issuing and redeeming proof. The wrapper, and the dialog's login form for its own
   requests, reload the page on that refusal, so a held request never writes to another account and a
   code never goes to an address the account no longer uses while the page's session lasts. Once an
   email change elsewhere has ended that session, a code can still go to the former address, but
   proving it signs nothing in and nothing is written. This also closes a hole that exists today: a
   stale tab could change the password of an account signed in from another tab.

## Server

- The guard stays the only authority. It takes the expected account id from the request. For a
  signed-in stale session it returns 403 with `code: "reauthentication-required"` and no `redirect`:
  the fetcher follows a redirect before any caller sees the result, which today reloads the page and
  discards what was typed. For another signed-in account it returns 401 with `code: "account-changed"`.
  Signed out, it still returns 401 with a redirect to `/login?returnTo=…`.
- The 60-second submission grace goes. It only covered writes racing the client timer, so
  `hasRecentAuthentication` takes the session alone.
- The email-change code and link handlers call the guard before verifying, so a refusal writes no
  attempt or proof, and pass the checked session to `applyEmailChange`.
- Email change keeps its server grant: issuing the code extends the requesting session's
  authorization to the code's expiry, and a resend keeps the original deadline. The code step and a
  resend (an `email-change` request carrying a `challengeKey`) run only in that session, so a stale
  session there means the code has expired too: those handlers return the ordinary ended-request
  refusal (`verificationEndedCode`) in place of `reauthentication-required`, so no dialog opens, and
  `EmailChange` already returns the person to the email form with that message.
- The link can be opened in any session of the account, whose deadline the grant never touched. When
  that session is stale, the link handler checks the link without writing, applying all of
  `verifyLink`'s rules (account, kind, decoy, latest request, expiry). A link it would reject gets its
  ordinary refusal, invalid or ended; only a link it would accept gets `reauthentication-required`, so
  the dialog opens and the replay verifies it. Email-change responses stop returning `authorization`.
- The password and emailed-code sign-in requests in reauthentication mode carry the expected account
  id, compared only with the caller's own session: when the cookie's session belongs to another
  account, or its account's current email differs from the submitted one, the server refuses with
  `account-changed` before checking a password or sending a code. Without a session the field is
  ignored and sign-in proceeds as usual, so the check reveals nothing about who owns an address. The
  reauthentication-mode login form reloads the page on that refusal.
- The `extend-authorization` action goes; it is an internal format. `extendAuthorization` stays for the
  grant with its transaction and expiry required, and its no-cookie refusal drops the
  `reauthentication-required` code. `serializeAuthorization` and the `Authorization` type go.
- The email-login shortcut keeps its recency check, so "email me a code" in the dialog always sends a
  code.
- Client removals: the timer, deadline and clock state, activity extension, pending-request bounds,
  `setAuthorization` and the `rotatesSession` option.

## Sign-in methods, now and later

- Every method offered in reauthentication mode completes inside the page: password and emailed code
  today; passkeys (WebAuthn) and Google through its popup or FedCM flow later. A method that must
  navigate the page away is not offered in this mode, so Google's redirect mode is excluded.
- Confirmation needs fresh proof. Google, in popup or FedCM form, is offered in this mode only once
  it is verified to force a fresh sign-in the server can check; until then Google users confirm with
  password or emailed code. Passkeys require `userVerification: "required"`.
- The emailed sign-in link opens `/login` in a new tab, signs in there and lands on the owning page
  already authorized. In the original tab the dialog offers "Try again", which runs the same replay.
- The dialog names the current account's address for its code; the email-change code step names the
  new address, so the two codes stay distinguishable.

## Host surface

A host renders one Kenstack server component per feature and passes only its own choices; Kenstack
owns the wrapper, its own URL parameters and the sign-in and impersonation branches.

- `EmailChange` gains a server entry that owns its whole setup, as `ResetPassword`'s loader does, and
  carries its own `Suspense` fallback. It reads the session, never the URL:
  - signed in, impersonation included, it wraps its client part in `ReauthenticationForm`; the guard's
    impersonation refusal explains why a change is unavailable;
  - signed out, it renders the client part unwrapped, which shows only its link outcomes.
- The client part owns its two link parameters:
  - `cancelEmailChange` cancels without a session and stays untracked, so it also works without fresh
    authorization;
  - `confirmEmailChange` verifies when signed in. Signed out, it sends the visitor to `/login` with a
    return to this page carrying the token it kept, since the parameter has already left the address
    bar. Email-change links are bound to the account, not the browser, so the link works after
    signing in on any device.
- Both emailed links land on `createEmailChange`'s `linkPath`, now required, which must be a public
  page. The host chooses that page and renders `<EmailChange />` on it; it reads no parameter and needs
  no gate exception. Civic sets it to a new public `/email-change` page, catalogued as unindexed in
  `src/lib/publicSite.ts`.
- Civic's profile page renders `<EmailChange />` in its section and drops its `ReauthenticationForm`,
  its cancel-link branch, its impersonation check and its copying of the link parameters into the
  sign-in return path.
- The login page drops its stale-session branch: the guard no longer sends a signed-in visitor there,
  and the CHANGELOG rule that asked hosts for the check goes.
- `EmailChange` drops its `apiPath` prop: the reauthentication dialog always posts to `/api/auth`, and
  no host passes it.

## Rules, written into `docs/auth-routing.md`

- A handler behind the guard calls it before its first write, quota claim or email.
- A protected request names the account its wrapper was rendered for, read from the wrapper, never
  from the live user info.
- The held function rebuilds the whole request rather than resending a stored body, so single-use
  contents such as a reCAPTCHA token are fresh. `Form`'s mutation already fetches its token per call.
- A Kenstack component whose endpoint uses the guard wraps itself in `ReauthenticationForm`; hosts
  never add the wrapper. Outside it, a refusal is only a status message.

## Public API changes

Extend the Unreleased "Shared Reauthentication" CHANGELOG note, which describes this cycle's API:

- `track` takes a function; `setAuthorization`, the `rotatesSession` option and
  `@kenstack/auth/reauthentication/Timer` are removed.
- `hasRecentAuthentication` takes the session alone.
- `requireRecentAuthentication` requires the expected account id, sends no redirect for a signed-in
  stale session and refuses another account with `account-changed`.
- `extendAuthorization` requires its transaction and expiry.
- `EmailChangeRequestResult` loses `authorization`. The password-change, email-change and
  reauthentication sign-in requests carry the account id.
- `@kenstack/auth/components/EmailChange` becomes a server component that wraps itself and loses its
  `apiPath` prop. Hosts remove their `ReauthenticationForm` around it and any link-parameter,
  sign-in or impersonation branching, render it from a server component, and set
  `createEmailChange`'s now-required `linkPath` to a public page that renders it.
- Rewrite the paragraphs on activity extension, submission grace, "does not replay an interrupted
  write", the guard reloading a stale form, and hosts checking recency before their login-page
  redirect.

## Verification

- Browser, recent session: both forms submit without a dialog.
- Browser, stale session (dev `authorized_until` in the past): the dialog opens with focus on its
  first usable control; password and emailed-code confirmation each replay and succeed; Escape during
  a replay does nothing; Cancel before replay leaves nothing written; the dialog's email cannot be
  changed; a late email-change code or link returns to the email form without a dialog; the emailed
  link confirms in a new tab and "Try again" replays in the first; on `/email-change`, the cancel
  link works signed out, the confirmation link verifies when signed in and, signed out, returns there
  after signing in on any device, and a stale change started there opens the dialog.
- Another account signed in from a second tab: a held or new submit, and a confirmation attempt,
  reload the page and write or send nothing.
- The account's email changed in a second tab: a confirmation attempt reloads the page and sends no
  code to the old address. A submit from the first tab still writes, because the same account signed
  in afresh; the binding exists to keep writes on their account, not on the email it was rendered
  with.
- Tests pinned to the timer, extension or grace are deleted; guard and form tests follow the new
  `track` signature and account id.

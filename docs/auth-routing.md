# Authentication Routing

This reference covers authentication behavior within a host proxy and the return destination consumed
by `requireUser`. The host owns its proxy, which may also handle rewrites, redirects, or other routing.

## Choosing where auth runs

Add proxy authentication when the host needs automatic return destinations or early redirects for
visitors without a session cookie. A host can instead pass a destination to
`requireUser(access, returnTo)`. Neither approach requires changing unrelated proxy behavior.

Apply the auth redirect only to pages that require login. APIs, other Route Handlers, public pages,
login and verification entry points, and assets must not enter that auth branch. They may still pass
through the host proxy for another purpose. Preserve existing matchers and routing when integrating
auth; for a proxy whose sole purpose is auth, use a narrow matcher to avoid unnecessary invocations.
Next.js requires literal matcher values, and protected-page prefetches can also invoke the proxy.

When changing a protected route, check whether its proxy auth selection should change too. Verify the
host's actual selection boundary: the matcher for an auth-only proxy, or the auth branch in a custom
proxy. Check both included pages and excluded requests. Preserve development-only access gates.

## Optional helper and custom proxies

`proxyAuth` from `@kenstack/auth/proxy` implements the cookie-presence check and request-path headers.
It can be the default export of an auth-only host proxy or be called within a custom proxy's protected
page branch. It returns a complete `NextResponse`; it does not compose another response's rewrites,
cookies, or headers. Use it where that response can be returned directly. A custom proxy that needs
to build its own response can implement the header contract below without calling the helper.

For GET and HEAD, the helper redirects a missing or empty `sessionId` to `/login?returnTo=...` with
`Cache-Control: private, no-store`. A nonempty cookie passes through for server validation. The helper
does no database or network reads, session validation, role checks, or cookie refreshes. API paths
and non-GET/HEAD requests pass through unchanged, so it does not replay a Server Action POST against
`/login`. These defensive bypasses do not prevent a metered proxy invocation.

## Request-path headers

The proxy forwards general request metadata in upstream request headers:

- `x-pathname`: the browser-facing pathname, without the query string.
- `x-search`: the query string including its leading `?`, or an empty string; omit Next.js's `_rsc` parameter.

Overwrite incoming values. For rewrites, capture these values before changing the request URL.
Preserve the custom proxy's other request headers and response behavior. Public response headers do
not supply these values to server code. URL fragments are unavailable to the server.

These headers are not specific to authentication; Kenstack's logging already consumes `x-pathname`.
Sites can forward them on additional pages by adjusting their proxy's matcher and branches. Keep
metadata forwarding separate from the decision to require login: broadening the matcher of a proxy
that directly exports `proxyAuth` also broadens its login check.

The headers carry navigation context only; they grant no access. Keep session and role checks in the
page and data-access code, and authorize actions and API handlers independently. Cookie presence
never replaces those checks.

`requireUser(access, returnTo?)` keeps the full session and role checks. For a signed-out user it uses
the explicit second argument when supplied, otherwise `x-pathname` plus `x-search`, otherwise plain
`/login`. The selected value passes through `getSafeReturnToPath`; an invalid explicit value falls
back to plain `/login`, not the headers. An empty string explicitly selects plain `/login`.

```ts
await requireUser("admin"); // Uses proxy navigation context when present.
await requireUser("authenticated", "/account?tab=orders");
```

An explicit argument controls only a redirect made by `requireUser`. If the proxy redirects first,
the page's argument cannot take effect. For a custom destination, align the proxy's early redirect
with that destination or let the page handle it. Reusable components can use the forwarded headers.
An authenticated user without the required role goes to plain `/login`; returning that user to the
same protected destination would loop.

`requireUser` reads the headers only when the user is signed out and the second argument is omitted.
Keep request reads and authorization outside shared cache scopes and under the appropriate Suspense
boundary, as described in `runtime-boundaries.md`. The return path does not change the session cache key.

## The page's account

- `fetcher` sends the account the tab's page was rendered for (`x-rendered-account`). The first
  `useUserInfo(authState)` seed in the document sets it: the account menu, the account links or the
  login step. After that only this tab's own sign-in or sign-out changes it, or a sign-in that a page
  rendered signed out takes on. A page with none of these seeds (such as a point-of-sale screen) sends nothing and is
  never compared.
- Every access-checked pipeline stage, and the admin API, compares it with the session before anything
  runs, and answers `409` with `code: "account-changed"` when they differ. A page rendered signed out
  sends nothing until it takes on a sign-in; a session that has ended gets the usual `401`.
- `Form` shows that refusal with a Reload button. A host API that checks access by hand moves onto its
  stage's `access`, so it is compared too.
- The user-info store follows the page's account. A page rendered for an account takes a user-info
  reload or a later server render only for that account; anything else opens the account menu's "Your
  sign-in changed" dialog and leaves the page as it is. A page rendered signed out takes a sign-in
  silently.
- A handler whose request changes the user or session, such as an account save, answers with
  `response.success({ returnUser: true })`. After the handler, the pipeline adds the fresh `userInfo`,
  and Kenstack `Form` adopts it as this tab's own change just before the form's `onSuccess`, so a
  step's `next()` lands in the same render. Hosts never set the store themselves.

## Emailed sign-in links between tabs

- A sign-in link opens in a new tab, often while the tab that asked for it still waits on its code
  form. As the link verifies, the link tab asks the site's other tabs on the `kenstack-sign-in`
  channel. Each code form on screen that can take the sign-in answers with its email, a confirmation's
  included, and the link tab matches the verified email against the answers. The messages never carry
  a token, challenge key or code.
- With a match, the link tab shows "You're signed in. Close this tab to continue." and leaves the user
  info and the flow alone. The waiting tab moves on at focus, when its user-info reload adopts the
  sign-in; a confirmation replays what it held.
- In a flow, an unanswered link carries on signed in, at this tab's step or the first step in a new
  tab, and on /login to its return step. A failed link (used, expired, or opened in another browser,
  which is refused) shows a dialog with Close, or "You're already signed in." when signed in; with no
  identity yet, a wrong-browser failure also offers "Request a new link". A failed confirmation link
  drops `identityConfirmed` from where the flow returns to, so that page never says "You're confirmed".
- Standalone Login, outside a flow, leaves for the server's destination once the link signs in, and a
  failure shows its message and leads back to its email form.

## Confirming identity for sensitive actions

Sensitive actions, such as changing a password or the sign-in email, need a recently authorized,
non-impersonated session. The server guard, `requireRecentAuthentication(request)`, is the only
authority; the page asks the person to confirm their identity only when it refuses a submit.

- A handler behind the guard calls it before its first write, quota claim or email, on a stage with
  `access`: the guard does not check the account, and the access check refuses a page rendered for
  another account.
- A protected request runs under the page's account (above), so a held request never replays for
  another account: the server refuses it.
- A confirmation or a completed password or email change in one tab reaches the account's other tabs
  over a `BroadcastChannel`: a confirmation replays what they hold, and a completed change drops it.
- The held request is a function that rebuilds the whole request rather than resending a stored body,
  so single-use contents such as a reCAPTCHA token are fresh. `Form`'s mutation tracks itself and
  fetches its token per call.
- A Kenstack component whose endpoint uses the guard wraps itself in `ReauthenticationForm`; hosts
  never add the wrapper. Outside it, a refusal is only a status message.

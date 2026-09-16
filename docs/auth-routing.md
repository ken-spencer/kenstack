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

When changing a protected route, check whether its proxy auth selection should change too. Test the
host's actual selection boundary: the matcher for an auth-only proxy, or the auth branch in a custom
proxy. Cover both included pages and excluded requests. Preserve development-only access gates.

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

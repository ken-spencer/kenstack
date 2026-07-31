# Error Containment and Reporting

Consult this reference when adding or changing public failure states, error boundaries, operational
reporting, or request metadata capture.

## Containment

- On a composite page, contain a failure at the section level only when that section is independently
  useful and independently queried. Use the canonical Kenstack section error boundary. If it does not
  exist, implement it in Kenstack before using it from a site; do not create a site-local boundary or a
  parallel reporting path.
- Keep expected empty results distinct from unexpected failures. The public failure state accepts a
  module title and says, “There is an unexpected problem loading {module title}. Please check back later.”
  Never expose exception messages, stack traces, query details, or error digests in the page.
- Keep route- or page-level error handling for failures that invalidate the whole route. Do not use a
  route-segment `error.tsx` to contain one sibling section when the rest of the page can remain useful.

## Operational Reporting

- Send unexpected runtime failures through `deps.error(...)` wherever application dependencies are
  available. Framework hooks and reporter-owned adapters may call `@kenstack/lib/errorReporter` directly.
  Expected invalid request data may use a narrow, sanitized `console.error` and must not be sent to the
  operational reporter merely for visibility. Do not add other bare `console.error` paths outside the
  reporter's intentional output and non-recursive failure safeguards.
- Expected suspicious activity, such as low risk scores, wrong actions, invalid user input, or ordinary
  provider rejections, may be worth sanitized permanent logging but must not call `deps.error(...)`.
  Reserve operational reporting for failures that require operator action; user-caused failures must
  never generate operator email.
- Error messages sent to `deps.error(...)` or permanent server logs must stand on their own. Identify the
  failure and any known status, code, or cause in the message. Use `context` only for structured filtering,
  correlation, or supporting details; do not repeat the message there or make context the only
  explanation.
- Use awaited Next.js `headers()` as the canonical source of incoming headers in supported request
  contexts. Use context already supplied by Next.js hooks, and capture sanitized header values before
  scheduling Server Component `after()` work. Reporting must still work without request metadata when no
  incoming request exists.

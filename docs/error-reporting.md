# Error Containment and Reporting

Consult this reference when adding or changing public failure states, error boundaries, operational
reporting, or request metadata capture.

## Containment

- On a composite page, contain a failure at the section level only when that section is independently
  useful and independently queried, using the canonical Kenstack section error boundary. If it does not
  exist yet, implement it in Kenstack before using it from a site; a site-local boundary or parallel
  reporting path is never the answer.
- Keep expected empty results distinct from unexpected failures. The public failure state accepts a
  module title and says, “There is an unexpected problem loading {module title}. Please check back later.”
  Exception messages, stack traces, query details, and error digests never reach the page.
- For an expected failure caused by stored or user-correctable data, preserve a usable repair path and
  tell the user what needs correction. Use the generic unexpected-failure state when the code cannot
  offer a safe specific action, or when the state is an unrecoverable invariant or security boundary.
- Route- or page-level error handling, including a route-segment `error.tsx`, is for failures that
  invalidate the whole route; a failing sibling section is contained at the section level while the
  rest of the page stays useful.
- A user-facing validation, notification, toast, or status message claims only what the reached branch
  proves and, when a safe action exists, tells the user what to correct or try next. Expected
  field-validation messages are the short fragments defined by the owning form conventions; unexpected
  failures stay deliberately non-diagnostic and use the generic contained failure state above.

## Operational Reporting

- Send unexpected runtime failures through `reportError(...)` from `@kenstack/lib/errorReporter`;
  framework hooks and reporter-owned adapters use the same owner directly. Expected invalid request data
  may use a narrow, sanitized `console.error` and stays out of the operational reporter. The only other
  bare `console.error` paths are the reporter's intentional output and its non-recursive failure
  safeguards.
- Expected suspicious activity, such as low risk scores, wrong actions, invalid user input, or ordinary
  provider rejections, may be worth sanitized permanent logging and never calls `reportError(...)`.
  Operational reporting is for failures that require operator action; a user-caused failure never
  generates operator email.
- Email delivery failures never call `reportError(...)`, because the operational reporter sends its own
  alerts by email. `@kenstack/lib/mailer` owns sanitized delivery-failure logging through
  `errorLog(...)` and returns its classified result; callers may translate that result into
  user-facing behavior and report nothing further.
- Error messages sent to `reportError(...)` or permanent server logs stand on their own: they identify
  the failed operation and any useful non-sensitive identifier, expected condition, status, code, or
  cause. Developer-facing configuration and API errors state the required state, the actual state when
  useful and non-sensitive, and the corrective action. `context` carries structured filtering,
  correlation, or supporting details, never a repeat of the message or the only explanation.
- Use awaited Next.js `headers()` as the canonical source of incoming headers in supported request
  contexts. Use context already supplied by Next.js hooks, and capture sanitized header values before
  scheduling Server Component `after()` work. Reporting still works without request metadata when no
  incoming request exists.

# Browser Verification

Use browser inspection to verify observable UI behavior in Kenstack and its host sites. Follow the host
repository's UI documentation for the correct origin, browser surface, and authenticated session.

## Wait for client state

Browser navigation and the first visible paint do not establish that React has hydrated or that
query-derived form state has reached a controlled input. Before reporting missing, empty, or stale UI
state:

- wait for a state-dependent signal, then inspect the element's current DOM property, such as
  `input.value`, `checked`, or the relevant accessible state;
- treat a screenshot or DOM read taken during initial rendering as provisional; and
- repeat the check after the state settles under the same origin, session, and navigation conditions.

If an automated tab disagrees with the user-visible in-app browser, resolve the timing or environment
difference before turning either observation into a finding. A finding must remain reproducible after
the client state has settled.

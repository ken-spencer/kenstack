# StepFlow visits keyed by id

Status: idea from Ken, 29 September 2026. Not designed or reviewed. Replaces the targeted "saved list
can only un-skip on mount" fix shipped with `07-host-wiring.md` once built.

- Each visit's saved state (step list, values, position) is stored under the visit's random id, and
  the id rides in the flow's URL (for example `/donate?visit=k3x9`), set with `history.replaceState`
  when the visit starts.
- The emailed sign-in link's return path carries the id, so the new tab resumes that visit; a reload
  keeps the id and its place, including development reloads.
- Arriving without an id (a menu, a bookmark, a fresh visit) starts a clean visit, so an old
  unfinished visit never leaks into a new one.
- Costs: a visible `visit` parameter; the link request carries the id (internal format); old visits
  expire from the browser store as today.
- Known gap it should close: the shipped un-skip-on-mount fix misses a page Next keeps in memory.
  Signed in on /donate, sign out from the account menu, click Donate in the header: Next shows the
  kept page (not a mount), and after signing in through the step, Back skips the sign-in step again.
- Checks: the kept-page path above; Back after in-flow sign-in; an emailed link opened mid-flow in a new tab; a reload
  mid-flow; arriving from the menu after an unfinished visit.
- Login flash, deferred here (Ken, 29 September 2026): signed out on `/login`, a code sign-in for an
  admin with complete details paints the details step's loading pulse for one round trip, then
  "Signed in" over LoginReturn's placeholder for two round trips (its destination lookup starts only
  when the step shows, and `router.replace` keeps that screen until the destination arrives). The
  sign-in refresh changes nothing on screen. Diagnosis, DOM recordings and a proven fix in Civic's
  `tmp/login-flash/` (`fix.diff`: seed the details query from the signed-in user info so the skip is
  decided at sign-in, look up the destination from an always-mounted return-step controller, and hold
  the login step with its pending code form until navigation). Settle it with this StepFlow rework.

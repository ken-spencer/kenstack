# Remove the sign-in step's signed-in view

Status: agreed with Ken, 29 September 2026; build after his presentation. Overlaps with
`10-stepflow-visit-id.md`; settle both together.

- Today the sign-in step has a signed-in view ("Signed in as … / Use a different account /
  Continue"). Its only real use is Back after an in-flow sign-in. It surfaced on the way forward in
  smoke testing and on `/login`.
- Change: when the visitor is signed in, the sign-in step is skipped both ways. Back from the step
  after it goes to the step before it. Switching accounts mid-flow goes through the account menu, or a
  small "Not you? Sign out" line where a flow needs it (for example on the details step).
- Likely removes: the saved starting step list's role in keeping sign-in reachable by Back, the
  un-skip-on-mount fix, the O-1 kept-page gap, and part of the reason for todo 10. Confirm by reading
  `StepFlow/context.tsx`, `Login/Step/Controller.tsx` and `Login/Step/Form.tsx` before building.
- Progress bars: a skipped step can show as completed, so a changing step count is not a problem.
- Checks: forward and Back through /donate, /take-your-seat, /volunteer and private screenings, signed
  out and signed in; an emailed link opened mid-flow; `/login` signed in and signed out.

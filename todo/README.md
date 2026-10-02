# Kenstack work queue

Active workstreams:

1. **Orphaned media cleanup** — build the fail-closed media-reference registry and report-only dry run first. Whole-row quarantine, revision pruning, cron execution, and the restore drill remain unimplemented. See `01-orphaned-media-cleanup.md`.

Deferred until the current work is reviewed and committed:

2. **Record-level optimistic concurrency** — a conditional update on `updatedAt` (no version column, no pre-query) refuses a stale editor save; on a miss, revisions decide whether the edits touch different fields (merge) or the same field (refuse, naming who). Design ruled 30 September 2026 and plan reviewed; every decision ruled. Ready to build. The PostgreSQL integration harness under `tests/integration/` is reusable for this work. See `02-record-version-concurrency.md`.

3. **Admin post-mutation list freshness** — determine and correct the brief stale-list flash after save, trash, or restore navigation. See `03-admin-list-cache-freshness.md`.

4. **Admin publication UX normalization** — table ownership of publish and SEO, the header publication control, the SEO dialog replacing `MetaFields`, the pinned edit-header action row with Cmd/Ctrl+S, and touch-safe drag activation landed 2026-09-03; record-wide draft isolation remains deferred. Settled design; implementation gated on a working browser build. See `04-admin-publication-ux.md`.

Planned work:

5. **Email log and address suppression** — add reusable staff views for outgoing messages and suppressed addresses, with SES delivery feedback updating message status. The message records also provide the basis for a future newsletter queue. See `05-email-log-and-suppression.md`.

8. **Per-module admin access** — let a role be granted access to individual admin modules, so someone can edit only news and spotlight, for example. A module's custom admin actions inherit that module's access. About 20 Civic admin action stages each declare `access: "admin"` today, so a forgotten line leaves an action open. Waiting for a use case.

9. **Account change detection** — every `fetcher` request states the account its page was rendered for, every access-checked pipeline refuses a mismatch with a message and a Reload action, and the account menu opens a "Your sign-in changed" dialog when the tab regains focus under a different account. Built 30 September to 1 October 2026; remove this entry and its file once committed. See `09-account-change-detection.md`.

10. **StepFlow per-tab state and sign-in hand-off** — flow state moves to sessionStorage and every same-tab arrival resumes the tab's step with no flash; an emailed link hands the sign-in back to the waiting tab ("close this tab"); the sign-in step's controller verifies links quietly; everything after a sign-in decides from its response, with the account details in the user info. Built 30 September to 1 October 2026; remove this entry and its file once committed. See `10-stepflow-visit-id.md`.

Deferred decision: whether the page editor's settings mount themselves. The page editor may be replaced by
the Composer (Civic plan 09); decide then. Today every editable page places both `PageEditor` and
`PageEditorSettings`.

Resolved review and bug lists are removed after their durable outcomes are retained in
code, tests, migration notes, or active policy. Completed plans are archived only when
they preserve lasting rationale that is not owned elsewhere. Resolved bug scans, the
superseded async-boundary plan, and the completed square-crop work have been removed
from this folder.

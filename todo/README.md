# Kenstack work queue

Active workstreams:

1. **Orphaned media cleanup** — build the fail-closed media-reference registry and report-only dry run first. Whole-row quarantine, revision pruning, cron execution, and the restore drill remain unimplemented. See `01-orphaned-media-cleanup.md`.

Deferred until the current work is reviewed and committed:

2. **Record-level optimistic concurrency** — a conditional update on `updatedAt` (no version column, no pre-query) refuses a stale editor save; on a miss, revisions decide whether the edits touch different fields (merge) or the same field (refuse, naming who). Design ruled 30 September 2026 and plan reviewed; every decision ruled. Ready to build. The PostgreSQL integration harness under `tests/integration/` is reusable for this work. See `02-record-version-concurrency.md`.

3. **Admin post-mutation list freshness** — determine and correct the brief stale-list flash after save, trash, or restore navigation. See `03-admin-list-cache-freshness.md`.

4. **Admin publication UX normalization** — table ownership of publish and SEO, the header publication control, the SEO dialog replacing `MetaFields`, the pinned edit-header action row with Cmd/Ctrl+S, and touch-safe drag activation landed 2026-09-03; record-wide draft isolation remains deferred. Settled design; implementation gated on a working browser build. See `04-admin-publication-ux.md`.

Planned work:

5. **Email log and blocked emails** — an "Email Log" of every outgoing message and a "Blocked Emails" admin module, with SES delivery feedback updating message status and blocking bounced or complaining addresses. The message table doubles as the future newsletter queue. Schema ruled 2 October 2026; built in three slices. See `05-email-log-and-suppression.md`.

6. **Admin Logs area** — a "Logs" group in the admin holding the Email Log (item 5) and an Audit Log viewer: a read-only list over the existing `audit_logs` table, filtered by person, action, record and date, answering "who changed this?" across the site. No Error Log for now: errors go to Vercel's logs, and serious ones email an alert; storing them would need a table, privacy rules and retention, for a developer audience. Revisit after launch if Vercel's logs prove painful. Planned 2 October 2026; needs a short plan before building.

7. **Per-module admin access** — let a role be granted access to individual admin modules, so someone can edit only news and spotlight, for example. A module's custom admin actions inherit that module's access. About 20 Civic admin action stages each declare `access: "admin"` today, so a forgotten line leaves an action open. Use case found 3 October 2026: staff roles such as volunteer coordinator and finance (Civic plan 27). Needs its own design next.

Deferred decision: whether the page editor's settings mount themselves. The page editor may be replaced by
the Composer (Civic plan 09); decide then. Today every editable page places both `PageEditor` and
`PageEditorSettings`.

Resolved review and bug lists are removed after their durable outcomes are retained in
code, tests, migration notes, or active policy. Completed plans are archived only when
they preserve lasting rationale that is not owned elsewhere. Resolved bug scans, the
superseded async-boundary plan, and the completed square-crop work have been removed
from this folder.

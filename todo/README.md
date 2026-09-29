# Kenstack work queue

Active workstreams:

1. **Orphaned media cleanup** — build the fail-closed media-reference registry and report-only dry run first. Whole-row quarantine, revision pruning, cron execution, and the restore drill remain unimplemented. See `01-orphaned-media-cleanup.md`.

Deferred until the current work is reviewed and committed:

2. **Record-level optimistic concurrency** — add a record version to prevent stale editor saves, then remove lower-level concurrency checks that the record guard makes redundant. The PostgreSQL integration harness under `tests/integration/` is reusable for this work. See `02-record-version-concurrency.md`.

3. **Admin post-mutation list freshness** — determine and correct the brief stale-list flash after save, trash, or restore navigation. See `03-admin-list-cache-freshness.md`.

4. **Admin publication UX normalization** — table ownership of publish and SEO, the header publication control, the SEO dialog replacing `MetaFields`, the pinned edit-header action row with Cmd/Ctrl+S, and touch-safe drag activation landed 2026-09-03; record-wide draft isolation remains deferred. Settled design; implementation gated on a working browser build. See `04-admin-publication-ux.md`.

Planned work:

5. **Email log and address suppression** — add reusable staff views for outgoing messages and suppressed addresses, with SES delivery feedback updating message status. The message records also provide the basis for a future newsletter queue. See `05-email-log-and-suppression.md`.

6. **Confirm identity on submit** — sensitive forms render normally; a stale submit opens an identity dialog and replays once confirmed, replacing the reauthentication timer. Reviewed design, not scheduled. See `06-reauthentication-on-submit.md`.

7. **Host wiring work order** — decisions on the places sites rewrite, copy or set up Kenstack's work, from the 28 September 2026 sweep, plus site-only fixes. All decisions ruled and the build plan reviewed clean, 28 September 2026; ready to build. See `07-host-wiring.md`.

8. **Per-module admin access** — let a role be granted access to individual admin modules, so someone can edit only news and spotlight, for example. A module's custom admin actions inherit that module's access (deferred from `07-host-wiring.md`). Waiting for a use case.

9. **Account change detection** — every `fetcher` request states the account its page was rendered for, the pipeline refuses a mismatch, and the page reloads with a notice; a tab also reloads when it regains focus under a different account. Replaces the per-form account binding from `06`. Proposed 29 September 2026; queue after `07` is committed. See `09-account-change-detection.md`.

10. **StepFlow visits keyed by id** — store each visit under its id, carried in the URL and the emailed link's return path, so a fresh arrival starts clean and a link or reload resumes. Idea, 29 September 2026. See `10-stepflow-visit-id.md`.

11. **TypeScript improvement sweep** — parallel Opus workers review all committed TypeScript for casts, restated types and machinery that inference could replace, spiking each candidate in `tmp/` before proposing it. Launch only when Ken asks, after his 29 September 2026 presentation. See `11-typescript-improvement-sweep.md`.

12. **Remove the sign-in step's signed-in view** — a signed-in visitor skips the sign-in step both ways; account switching goes through the account menu. Build after the 29 September 2026 presentation, together with 10. See `12-remove-signed-in-step-view.md`.

Resolved review and bug lists are removed after their durable outcomes are retained in
code, tests, migration notes, or active policy. Completed plans are archived only when
they preserve lasting rationale that is not owned elsewhere. Resolved bug scans, the
superseded async-boundary plan, and the completed square-crop work have been removed
from this folder.

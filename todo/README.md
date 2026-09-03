# Kenstack work queue

Active workstreams:

1. **Orphaned media cleanup** — build the fail-closed media-reference registry and report-only dry run first. Whole-row quarantine, revision pruning, cron execution, and the restore drill remain unimplemented. See `01-orphaned-media-cleanup.md`.

Deferred until the current work is reviewed and committed:

2. **Record-level optimistic concurrency** — add a record version to prevent stale editor saves, then remove lower-level concurrency checks that the record guard makes redundant. The PostgreSQL integration harness under `tests/integration/` is reusable for this work. See `02-record-version-concurrency.md`.

3. **Admin post-mutation list freshness** — determine and correct the brief stale-list flash after save, trash, or restore navigation. See `03-admin-list-cache-freshness.md`.

4. **Admin publication UX normalization** — `defineTable` ownership of the publish and SEO features, the shared publication header control, the header-triggered SEO dialog replacing `MetaFields`, and the pinned edit-header action row. Touch-safe drag activation landed 2026-09-03. Settled design; implementation gated on a working browser build. See `04-admin-publication-ux.md`.

Resolved review and bug lists are removed after their durable outcomes are retained in
code, tests, migration notes, or active policy. Completed plans are archived only when
they preserve lasting rationale that is not owned elsewhere. Resolved bug scans, the
superseded async-boundary plan, and the completed square-crop work have been removed
from this folder.

# Kenstack work queue

Only one workstream remains active:

1. **Orphaned media cleanup** — build the fail-closed media-reference registry and report-only dry run first. Whole-row quarantine, revision pruning, cron execution, and the restore drill remain unimplemented. See `01-orphaned-media-cleanup.md`.

Deferred until the current work is reviewed and committed:

2. **Record-level optimistic concurrency** — add a record version to prevent stale editor saves, then remove lower-level concurrency checks that the record guard makes redundant. See `02-record-version-concurrency.md`.

Completed reviews, resolved bug scans, the superseded async-boundary plan, and the completed square-crop work have been removed from this folder.

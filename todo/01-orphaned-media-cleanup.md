# Cleanup path for orphaned images and files

## Active status

**Open.** Cleanup of staged and superseded square variants is implemented and now reports failures through `deps.error()`. Whole-row orphan cleanup is not implemented. The next useful milestone is the fail-closed reference registry plus a report-only dry run; quarantine, the cron route, revision pruning, and the restore drill remain later work.

## Problem

Media rows and S3 objects can be orphaned: uploads that never complete (`status: "pending"`), uploads completed but never attached to a record (`status: "uploaded"`), and media detached from records (`status: "removed"`). Nothing currently deletes the S3 objects or prunes the rows.

## Current state

- Table: `src/db/tables/media/index.ts` — `mediaStatusEnum` = `pending | uploaded | attached | removed`, with `media_status_idx` index. Columns include `sourceKey` (S3 key), `variants` (jsonb with per-variant `key`s), timestamps via `defineTable`.
- S3 client + upload logic: `src/fields/records/mediaUpload.ts` (uses `AWS_S3_BUCKET`, `AWS_S3_REGION`/`AWS_REGION`).
- Status transitions: `src/fields/server/image.ts`, `mediaList.ts`, `file.ts` set `attached` / `removed` on save.
- Consuming app cron config: `agatesprings.com/vercel.json` (currently has no `crons` entry).

## Adversarial review (2026-07-18)

The cleanup goal is sound, but the original plan is not safe to implement as written:

- `status` is not a reference count. Single image/file fields store a media **id** in integer columns, not a URL, and those columns do not consistently have database foreign keys. Media-list fields use `*_media` tables. Removing one use can currently mark a media row `removed` even if another record still references the same id. A shared cleanup function therefore cannot prove orphanhood from `status`, `media.table`, or a scan of `*_media` tables alone.
- Revision history has no 30-day retention limit. Image, file, and media-list fields are revisioned by default, and revision snapshots can contain media ids/URLs that a user may restore much later. “Past grace period for revisions/undo” is false until the product explicitly defines whether old revisions are allowed to restore deleted media.
- Quarantining only the keys currently named by `sourceKey` and `variants` misses superseded variant keys created by future recrops unless the recrop flow records or removes them. Plan 02 and this plan need one object-lifecycle contract.
- S3 copy, S3 delete, and the database update are not one transaction. The worker needs an idempotent state machine and retry behavior for partial copies/deletes; a simple `CopyObject` → `DeleteObject` → status update can strand objects or rows.
- Claiming a row also races with a user attaching an `uploaded` item. The current save flow reads `uploaded`, writes the record reference, and marks media `attached` later in the transaction. The race is extraordinarily unlikely after the cleanup retention windows, so mitigation should remain entirely on the background cleanup path and add no new work to normal saves.
- Moving an object to `deleted/` does not make it private if the bucket policy exposes that prefix. This plan intentionally treats the prefix as recoverability/quarantine only. Privacy deletion is a different feature and is outside this cleanup path.
- Vercel invokes cron routes with `GET`, does not retry failed invocations, can deliver duplicates, and warns about overlapping runs. The route must reject a missing `CRON_SECRET`, and the worker must be safe under duplicate/concurrent invocation. See [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

**Decision gate:** do not enable destructive mode until the host supplies a complete reference registry (single-value media columns plus media-list tables), the revision-retention behavior is decided, and a restore drill succeeds against quarantined objects.

## Resolutions (Ken, 2026-07-18 through 2026-07-19)

- **Revisions expire after 90 days initially.** Ken's direction: revisions get their own retention period and can lose media after they expire. Keep 90 days fixed at first; make it configurable later only when a host has a real need. Concretely: (1) live revision snapshots ARE a reference source — media they reference is never quarantined; (2) add revision pruning to this plan's scope: delete revision rows older than 90 days; (3) a `removed` media row is cleanable only when past its own retention AND unreferenced by any live revision.
- **Retained revisions protect media by id through a snapshot scan.** Each media-capable field owns a small extractor for the media ids in its saved revision value. Cleanup scans all snapshots retained within the previous 90 days and treats any extracted id as an active reference. Do not match URLs and do not add a revision-to-media index unless measurements later justify one. A restored revision then creates a current-record reference, which continues protecting the media through the normal reference check.
- **Retention confirmed:** pending 24h, uploaded-never-attached 7d, removed 30d (plus the revision condition above).
- **Eligible media remains quarantined for another 90 days before permanent object deletion.** Treat “three months” as a fixed 90-day worker interval so eligibility is deterministic. Test quarantine and restoration first, then leave permanent purge disabled through one complete 90-day quarantine cycle before implementing or enabling the deletion path.
- **`deleted/` is an operational recovery net, not a security boundary.** It may remain publicly readable throughout quarantine. Removing media stops the site from referencing it but makes no promise that a known object URL immediately becomes inaccessible. The 90-day window exists so an operator can discover that important media disappeared and restore it before permanent purge. Any future privacy-deletion requirement needs a separate, explicitly designed path.
- **State machine:** accept the review's recommendation — timestamps (`quarantinedAt` etc.) plus an explicit processing-state column, not a terminal enum alone.
- **The attachment race gets cleanup-side, no-impact mitigation only.** Do not add locks, retries, restoration, or new state handling to the normal attachment/save path solely for this edge case. Cleanup owns every wait, retry, backoff, recheck, and recovery cost. It uses a short non-blocking claim, rechecks references and claim state before deleting the original, and checks once more after the move. A normal save's existing `attached` update invalidates the cleanup claim. If the final check discovers the vanishingly small race after the move, the cleanup worker restores from its verified quarantine copy and reports the recovery.
- **Current-reference registry uses automatic standard entries plus explicit exceptions.** Kenstack fields register their own image, file, and media-list reference locations. A host declares only custom/raw paths and legacy references whose original module definition is no longer active. Registry validation fails closed when a known field lacks reference metadata or a declared location cannot be resolved. Project instructions prohibit undeclared raw media references. Do not require a broad foreign-key migration for cleanup.
- **Removing a module requires an explicit decommissioning step.** A removal must choose whether its data remains recoverable or is discarded. Retained records and revisions keep their legacy media-reference and revision-extractor registrations. Discarded data is migrated or deleted explicitly, its affected media ids are handed to the canonical detachment lifecycle, and the old registrations remain until a zero-reference check succeeds. Removing a module definition alone never makes its media eligible for deletion.
- **Module decommissioning is review-triggered and migration-driven.** Agent/review instructions flag a removed module and require decommission evidence before the change is complete. A host-owned command provides the development dry run. Live data changes run as an idempotent, one-shot production migration after a successful application build, during a staged retirement sequence described below. The migration reuses the canonical registry and detachment lifecycle; it does not implement S3 cleanup itself.
- **Media rows are lifecycle records and are not hard-deleted through normal application paths.** The row retains the S3 source and variant keys through eligibility checks, quarantine, restore, and permanent object deletion. After S3 purge succeeds, keep a small database tombstone instead of deleting the only audit record of the objects. Foreign keys may provide separate relational-integrity hardening, but they do not replace the S3 cleanup state machine.
- **Variant churn sends explicit object-cleanup messages through the existing save-handler handoff.** Re-cropping and future variant replacement can obsolete one key while the media row remains `attached`, so row status can never make those objects eligible. The crop save passes the superseded key out of the committed save handler and dispatches it after `saveRecord` succeeds; a failed processing/save path dispatches the unused staged key instead. For reproducible derived variants, the centralized consumer may schedule an idempotent background delete directly—the original remains available for regeneration, so the row-level quarantine worker is unnecessary. Do not delete inline, and do not add a crop endpoint or parallel queue API.

## Readiness note (Codex, 2026-07-18)

**Variant replacement cleanup is implemented; row-level quarantine/destructive behavior is not.** Messaging staged and superseded variant keys does not depend on proving whole-record orphanhood: the producer's compare/swap proves whether a key became current or was displaced. The save-handler consumer schedules S3 deletion in background work and logs failures without exposing object keys; S3 deletion is idempotent. A live recrop/reset test confirmed that the committed key stayed readable and the superseded derived key was removed. All product and concurrency decisions in this plan are now settled; no row-cleanup implementation has been authorized.

## Planning decision brief (Codex, 2026-07-19)

This section supplies the context needed to finish the plan. It does not authorize implementation.

### How retained revisions expose media references

Revision snapshots are JSON objects shaped by the fields that opted into revisions. Image and file values include a numeric media `id`; media-list values contain items with numeric media `id`s. Restoration loads these values back into the same fields. The cleanup worker must therefore protect media ids found through known media-capable fields, not search for URLs or recursively treat every number in arbitrary JSON as a media id.

Two viable designs:

1. **Field-owned extraction plus a retained-snapshot scan — recommended initially.** Each media-capable field exposes how to extract its media ids: image/file returns `value.id`, and media-list returns its item ids. When claiming a cleanup candidate, scan retained snapshots from the last 90 days and run the extractors for the relevant field definitions. This reuses the field contract, has no new relation table, and suits Kenstack's expected low revision volume.
2. **A revision-to-media index.** Run the same extractors when a revision is created and store `(revisionId, mediaId)` rows for indexed lookups. This makes claims cheaper at high volume, but adds a table, migration, write-path maintenance, pruning coordination, and backfill requirements.

**Decision (Ken, 2026-07-19):** use field-owned extraction and scan every retained snapshot from the previous 90 days. Preserve the extractor boundary so an index can be added later without changing field semantics. Do not add the index unless query measurements reveal a problem. The scan must still recognize media fields renamed or removed during that 90-day window; keep their old extractor registrations until the affected snapshots expire.

### How cleanup knows where media is still in use

Before deleting a media object, cleanup must know every database location that might still contain its id. These locations include ordinary image/file columns, media-list join tables, settings, profile fields, page-editor fields, and any custom code that saves a media id.

Removing a module is an explicit decommissioning operation with one of two outcomes:

1. **Retain its data.** Keep the old media-reference locations and revision extractors registered for as long as its records or revisions remain. Hiding or unregistering the module does not make those media objects orphaned.
2. **Discard its data.** Collect the module's media ids, migrate or delete its records and revisions, and hand those ids to the canonical media-detachment lifecycle. Keep the legacy registrations until validation proves that the old locations contain no references. The normal retention, global reference check, and quarantine process then decide whether each media object can be removed; shared media remains protected elsewhere.

The module definition and its legacy registrations can be removed only after that chosen cleanup step succeeds. A migration or decommission command should make this requirement explicit; ordinary S3 deletion is never part of module removal.

The review note is the trigger and release gate. Development can use a manually run script, but live data needs a deployment-safe migration sequence:

1. **Review and dry run.** Review identifies that a module definition, table, or media-bearing field is being removed. The developer runs the host-owned command against disposable data and reviews its record, revision, and media-reference counts.
2. **Deploy a retirement-compatible version.** Hide or stop using the module while retaining its schema, data, media registrations, and revision extractors. Production is now safe if the data disappears during a later deployment or that later deployment fails after running its migration.
3. **Run the one-shot migration after a successful build.** A later production build runs the decommission migration only after the application build succeeds. **Retain** verifies that legacy registrations remain. **Discard** migrates/deletes the host data and hands the collected media ids to Kenstack's canonical detachment lifecycle. The operation is idempotent, production-gated, and recorded in a migration/job ledger so rebuilds cannot repeat it incorrectly.
4. **Verify.** A zero-reference check and migration record provide the evidence needed to close the review note. S3 objects still follow normal retention and quarantine.
5. **Remove temporary wiring in a follow-up deployment.** Remove the one-shot build registration and, for discarded data, the obsolete module/schema/legacy registrations only after verification. Keep the migration record or historical migration file for audit and reproducible deployments.

“After build” is not the same as “after deployment.” Vercel finishes the build before it promotes the new deployment to the production domain. Running the migration after `next build` avoids changing live data when the application build fails, but the previously deployed application is still serving while the migration runs. The retirement-compatible first deployment is what makes that ordering safe. A verified `deployment.promoted` webhook could run work after the new version starts serving, but that adds permanent delivery, authentication, retry, and observability machinery for a rare operation; do not add it unless the staged build approach proves insufficient.

The current host build runs ordinary database migrations before `next build`. Implementation planning must split this one-shot destructive data work into a distinct post-build phase; do not silently place it in the existing pre-build migration command.

The host owns its module-specific data migration. Kenstack owns reusable inventory, registry validation, detachment, and zero-reference behavior. This keeps the operation explicit without creating another media-cleanup path.

The main risk is simpler: a developer can add a custom column containing a media id and forget to tell cleanup about it. Kenstack cannot recognize an arbitrary integer column as media automatically. The project therefore constrains where media references may be created and requires explicit registration for every exception.

Recommended initial contract:

- Kenstack automatically builds the standard list from the host's resolved image, file, and media-list field definitions. Include every field set that can save media, not only module admin lists.
- Custom/raw media columns and legacy references from removed modules must be declared explicitly.
- Validation fails closed if a media-capable field has no reference extractor, a declared table/column cannot be resolved, or destructive mode is requested without a complete resolved contract.
- As an additional check, compare declared sources with database foreign keys targeting `media.id`. This catches omitted FK-backed references, but cannot discover an unmarked raw integer column.
- Prove behavior with negative tests: deliberately mark still-referenced media as `removed` for every standard and additional source, and verify that none can be claimed.
- Add an agent/project instruction: new media references must use a Kenstack media field helper or register an explicit exception.
- Add agent/review and migration instructions: flag module or media-field removals; require the retirement-compatible deployment, dry run, one-shot production migration, and zero-reference evidence; and remove temporary build wiring only in a verified follow-up deployment.
- Prohibit normal application code from hard-deleting media rows. Cleanup keeps each row through S3 quarantine and purge, then retains it as a tombstone.

**Decision (Ken, 2026-07-19):** standard Kenstack media fields register themselves; custom or legacy media columns must be declared; cleanup refuses to delete when it cannot resolve known or declared locations. Media rows remain as lifecycle records and tombstones, so S3 keys are not lost through premature database deletion. Foreign keys are optional integrity hardening outside this cleanup plan.

### Low-impact attachment-versus-cleanup race handling

There is a theoretical race if cleanup checks references and a save attaches the same media before cleanup moves its S3 objects. The retention windows make this extraordinarily unlikely, so the mitigation must not burden every normal media save.

Recommended contract:

- Leave the canonical image, file, and media-list attachment handlers unchanged for this race. Their existing update to `attached` is the signal that cleanup must yield.
- Cleanup claims a candidate in a short transaction using a non-blocking row operation such as `FOR UPDATE SKIP LOCKED`. It skips rows involved in another transaction and retries them on a later run.
- After copying and verifying the quarantine object, cleanup rechecks current-record references, retained-revision references, and its claim state/version immediately before deleting the original. If anything changed, it abandons the move and cleans up the unused quarantine copy idempotently.
- After the original is deleted, cleanup performs one final reference/state check. If the improbable race landed in that last gap, the worker restores the original from the verified quarantine copy and sends the event through normal error reporting.
- Keep S3 copy/delete outside the database transaction. The committed processing state drives resumable, idempotent object work.
- Do not introduce a priority scheduler, attachment retry path, or automatic restoration behavior into foreground saves.
- When safety requires waiting or retrying, delay the background cleanup item or defer it to a later run. Never make an interactive save wait for cleanup work.

**Decision (Ken, 2026-07-19):** normal saves always have performance priority. Cleanup yields to the existing `attached` state change and absorbs every delay or retry needed for the low-impact safeguards above. If implementation cannot preserve that boundary simply, leave the theoretical race documented instead of complicating the attachment path.

### Quarantine and purge policy

Eligibility and quarantine are separate clocks. A `removed` item first waits 30 days and must be absent from current records and all retained revisions. Once eligible, quarantine moves its source and variants under `deleted/` while retaining enough mapping/state to restore them. Purge later deletes quarantined objects permanently.

For example, an item with no revision reference can enter quarantine 30 days after removal and be purged 90 days later—no earlier than roughly 120 days after removal. If a revision created at removal still references it, the 90-day revision window delays quarantine; with another 90 days in quarantine, permanent object deletion would occur no earlier than roughly 180 days after that revision was created.

Recommended starting policy:

- Quarantine for **90 days** after an item becomes eligible. Low volume makes the extra storage inexpensive and provides a substantial recovery window.
- Start with report-only dry-run and review the candidates. Next, quarantine one disposable object and complete a restore drill. Enable bounded real quarantine only after both succeed.
- Leave permanent purge unimplemented or disabled for the first complete 90-day quarantine cycle. Use that period to test reporting, retries, and restoration before adding the deletion path.
- On purge, delete objects idempotently but retain a small database tombstone (`purged` state, identifiers, timestamps, and error history) for audit and retry rather than immediately deleting the media row.
- Superseded reproducible variants remain on their existing immediate cleanup-message path; they do not enter whole-row quarantine.

The current `deleted/` prefix is publicly readable by design. Quarantine gives the operator time to notice an important accidental removal and restore it. Site removal stops rendering or linking the media; it does not promise immediate loss of direct URL access. A future privacy-deletion feature must define its own immediate access revocation, revision, recovery, and purge behavior rather than changing this operational recovery path.

**Decision (Ken, 2026-07-19):** use a 90-day quarantine after eligibility and test it through one complete cycle before adding or enabling permanent deletion. Keep `deleted/` publicly readable as a recoverability mechanism with no privacy claim.

## Plan

1. **Define a recoverable state machine before S3 writes.** Prefer a timestamp such as `quarantinedAt`/`deletedAt` plus explicit processing state over only adding a terminal enum value; the timestamp is needed for purge eligibility. Record enough information to resume and restore every object after a partial run. Quarantine with `CopyObjectCommand` to `deleted/<original key>`, verify the copy, then delete the original. Do not assume the prefix is private.
2. **Accept explicit object-cleanup messages from variant producers — implemented for square recrops.** Reuse the existing save-handler message handoff: committed saves dispatch the superseded key after the database transaction succeeds; failed crop preparation/save dispatches the unused staged key. Messages include the owning media id, object key, and reason (`staged_variant` or `superseded_variant`). The centralized consumer schedules an idempotent background S3 delete. This immediate path is limited to replaceable derived variants and does not change the quarantine rules for source objects or whole media rows.
3. **Cleanup criteria** (each S3 object = source + every key in `variants`):
   - `pending` older than 24h → orphaned upload intent, no object may exist; verify before acting.
   - `uploaded` older than 7 days → completed upload never attached.
   - `removed` older than 30 days → detached from current records. This is not safe merely because 30 days passed; it must also be unreferenced by every current record and every revision retained within the last 90 days.
   - Never touch `attached`.
4. **Host-owned reference proof before quarantine:** resolve standard reference sources from the host's media-capable field definitions, accept explicit additional references for custom/raw paths, and use the field-owned extractors to check retained revision snapshots. Check all resolved sources for each candidate while holding the shared media-row claim lock. If the contract is absent/incomplete or the claim loses a race, skip the row. Do not scan for URLs: current fields store ids. Update the normal attach paths through their existing save handlers to coordinate with the same row lock/state transition.
5. **Script location:** put reusable worker behavior under a server-owned Kenstack media path (not a generic `db/scripts` dumping ground), with a small host-owned runner/route. Accept a bounded batch size, dry-run flag, and the host reference registry. Query by status plus the timestamp representing the current status transition; add a composite index only if the real query plan needs it. Use bounded concurrency based on measured memory/network behavior rather than an arbitrary 100 simultaneous S3 operations. Emit structured counts and media identifiers; do not log credentials, signed URLs, or full object keys by default.
6. **Cron route:** route handler in the consuming app, e.g. `src/app/api/cron/cleanup-media/route.ts`, calling the kenstack function. Guard with `CRON_SECRET` (Vercel sends `Authorization: Bearer <CRON_SECRET>`). Add to `vercel.json`:
   ```json
   "crons": [{ "path": "/api/cron/cleanup-media", "schedule": "0 4 * * *" }]
   ```
   The handler must be `GET`, must fail closed when `CRON_SECRET` is unset, and must compare `Authorization` with `Bearer ${CRON_SECRET}`. Keep runtime under the deployed Vercel function limit, claim work atomically, and make duplicate/overlapping invocations idempotent. Vercel does not retry failures, so leave failed rows resumable. The schedule is UTC.
7. **Dry-run and restore drill first:** ship with dry-run as the only behavior initially. Compare every candidate with the complete reference registry, review results, then quarantine a deliberately uploaded disposable object and prove it can be restored before enabling a real batch.
8. **Later phase (not now):** after a full 90-day quarantine and one clean test cycle, permanently delete objects from `deleted/` while retaining a small database tombstone. An S3 lifecycle rule on the prefix may be added as a backstop after its interaction with restore and audit windows is verified.

## Acceptance criteria

- Dry-run mode reports candidates without touching S3 or DB.
- Attached **or referenced** media is never claimed, including a deliberately inconsistent `removed` row still referenced by a single media-id column or media-list table.
- A module-removal test proves that retained module data keeps its media protected and that discarded module data enters the normal detachment/retention path without deleting media still shared elsewhere.
- A focused cleanup-worker test proves that a changed attachment/reference state aborts deletion and that a simulated reference appearing in the final gap restores the original from quarantine. No new foreground attachment behavior is required.
- Revision behavior is documented and tested: either a retained revision can restore its media, or the UI clearly handles media that expired under the approved retention policy.
- Duplicate/concurrent worker runs and failures after each S3/DB step are idempotent and resumable.
- Objects land under `deleted/` preserving original key paths; the media row records quarantine time/state and can drive a tested restore.
- Permanent purge refuses any object quarantined for fewer than 90 days, and the deletion path remains disabled until a complete test cycle and restore drill have succeeded.
- Cron route rejects requests when `CRON_SECRET` is missing or invalid.
- Destructive (non-dry-run) mode cannot be enabled unless shared reporting and email alerting are configured; worker failures and race recoveries must provably call `deps.error()`.
- Permanent purge is implemented as the S3 lifecycle rule on `deleted/` (90 days), not as worker code; restore behavior near the lifecycle deadline is documented and drilled.
- `tsc` clean; migration included for any enum/column change.

## Decision status

All product, retention, reference, recovery, and concurrency decisions are settled. Exact API names, state columns, and migration shapes remain implementation details rather than product decisions.

## Final adversarial review (Fable, 2026-07-19)

Asked explicitly: is this genuinely safe enough for destructive work, and does a simpler safe design exist?

**Safety verdict: yes, with the gates as specified.** The load-bearing safety properties are all present: fail-closed reference registry (refuses destructive mode when any known field lacks metadata or a declared location can't resolve), revision snapshot scan via field-owned extractors, claim → copy → verify → recheck → delete ordering with the post-delete recheck/self-restore, `SKIP LOCKED` claims that yield to normal saves, dry-run-first with a restore drill, and rows retained as tombstones. No single failure mode I can construct deletes referenced media. The complexity is in the right place — cleanup absorbs it all; the save path is untouched.

**Simpler safe design — one real simplification found, adopt it:**

- **Replace the entire permanent-purge code path with an S3 lifecycle rule on `deleted/`.** The key insight: lifecycle expiration counts days from **object creation**, and the quarantine _copy_ is a newly created object — so a lifecycle rule on the `deleted/` prefix expiring objects after 90 days implements "purge 90 days after quarantine" exactly, with zero purge worker, zero purge scheduling, zero purge failure handling. (This is also why tag-based quarantine, the other simplification candidate, does NOT work: expiring by tag still counts from the original object's creation date, so old objects would purge nearly immediately after tagging. Copy-to-prefix is the design that makes lifecycle purge correct — keep it.)
- Consequences to fold in: plan step 8 shrinks to "add the lifecycle rule after the first successful restore drill"; the `purged` tombstone state is set lazily (when a restore attempt finds the object expired) or by a light reconciliation pass, not by a purge worker; the restore drill must document that restore is only guaranteed before ~day 90 of quarantine; the rule's 90 days should be set from day one so the clock is the same in test and real operation.
- Simplifications considered and rejected: tag-based quarantine (above — lifecycle timing breaks it); FK-based reference proof (Ken already excluded a broad FK migration; registry is the right substitute); skipping quarantine for `uploaded`-never-attached rows (a user's draft upload deserves the same recovery window). For `pending` rows the plan already implies the right minimalism — verify no object exists, mark the row, nothing to quarantine.
- Worth restating for scope honesty: on a low-volume family site the destructive phase buys hygiene, not meaningful storage savings. The phased gates make it safe to build; the dry-run report alone may prove sufficient for a long time, and stopping after dry-run + drill is a legitimate outcome.

**Reporting prerequisite (Q from Codex): yes, for destructive mode — no, for dry-run.** The worker runs unattended by cron; failed moves, aborted claims, and above all the post-delete race-recovery event are exactly the "must reach an operator" class. The shared reporter, capture path, and deduplicated email alert must be configured before **destructive** cleanup is enabled. Dry-run/report-only phases need only the existing structured logging plus a run summary. Gate added to the acceptance criteria below.

## Status and recommended next step (Codex, 2026-07-19; updated Fable 2026-07-19)

**Planning decisions complete; final adversarial review done.** Amendments from the review: lifecycle-rule purge replaces the purge worker (step 8), and destructive mode is gated on shared reporting and alerting being live. Dry-run implementation can be authorized independently. No row-cleanup code should begin from this planning discussion alone.

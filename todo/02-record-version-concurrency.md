# Record-level optimistic concurrency

## Status

**Deferred. Do not implement until the current work has been reviewed and committed.** This is a separate feature and should begin from a clean baseline.

## Problem

An edit form can remain open while another request changes the same record. The older form can then save stale values over newer work. A few lower-level paths defend against individual races, such as square-crop persistence comparing the previously loaded variant key, but those checks cannot protect the record as a whole and produce feature-specific conflict handling.

## Decision

Use an integer record version as the optimistic-concurrency token. Keep `updatedAt` as the human-readable modification time.

The edit loader returns the current version. The client submits that version in the save envelope, outside user-editable field values. The record update increments the version only when the submitted value still matches:

```sql
UPDATE records
SET
  ...,
  version = version + 1
WHERE id = submitted_id
  AND version = submitted_version
RETURNING version;
```

No returned row means the record was deleted or changed after the editor loaded it. The save must stop without applying a partial update.

## Implementation outline

1. Add a non-null integer `version` column with a default of `1` through the standard Kenstack table path for editable records. Decide whether this is a `defineTable` capability or a standard column before changing host tables; do not hand-roll parallel implementations in each module.
2. Include `version` in edit loaders and successful save responses. Keep it in the save envelope rather than the field schema so ordinary fields cannot modify it.
3. Compare and increment the version atomically in the record save transaction. Every save path that can change the record or its owned relationships/media must advance the same version.
4. Return a distinct conflict result when the guarded update matches no row. The editor should explain that the record changed and offer reload/review. Any overwrite must be a separate, explicit action using the current server version; never retry a stale payload automatically.
5. Check the version before expensive preparation when practical, then repeat the atomic guard during persistence. Preparation can race after a preflight check, so the transaction remains authoritative. Existing failure cleanup must remove staged media objects when the final guard rejects the save.
6. Add focused coverage for two editors loading the same version, one successful save, one rejected stale save, and an explicit overwrite if that option is implemented. Cover relationship and media-only changes so they cannot bypass the parent version.

## Lower-level concurrency cleanup

After the record-level guard is implemented and every mutation path is proven to participate, audit the lower-level compare-and-swap checks and remove those that duplicate the record version.

Start with `src/fields/records/mediaCrop.ts`: its square-variant key comparison and crop-specific conflict message may become redundant when all crop mutations are owned by one versioned record save. Remove it only after confirming that the same media row cannot be changed through another parent record or an unversioned path.

Keep guards that enforce a distinct boundary. Authorization, ownership, upload completion, record existence, media integrity, and external-service validation remain necessary even after optimistic concurrency moves to the record level.

## Acceptance criteria

- A stale editor cannot overwrite a newer record save.
- The version comparison and increment occur atomically in the same transaction as persistence.
- Field, relationship, and media-only saves all advance the record version.
- A conflict leaves the record and its owned data unchanged and cleans up staged external objects.
- The client receives the new version after a successful save and a distinct conflict result after a stale save.
- Overwriting newer work requires an explicit user decision and a new request.
- Redundant lower-level concurrency checks are removed only after their mutation paths are covered by the record version; non-concurrency safety checks remain.
- Kenstack and a representative host pass TypeScript, lint, and focused concurrency tests.

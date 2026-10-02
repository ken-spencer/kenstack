# Record-level optimistic concurrency

## Status

Design ruled with Ken, 30 September 2026. Plan reviewed by Opus and Astra; one decision is open for
Ken (below). Build after todos 09 and 10 land, by a separate agent, through the development workflow
with Opus and Astra review.

## Problem

An edit form can stay open while another admin saves the same record. The older form can then save
stale values over newer work. A few lower-level paths defend against single races, such as square-crop
persistence comparing the previously loaded variant key, but they cannot protect the record as a whole.

## Ruled design

- **The token is `updatedAt`, not a version column.** It is useful in its own right ("3 changes since
  you opened this"), and no new column is threaded through every table.
- **Optimistic save, no pre-query.** The parent update is conditional:

  ```sql
  UPDATE record
  SET <changed fields>, updated_at = <next token>
  WHERE id = $id
    AND deleted_at IS NULL
    AND date_trunc('milliseconds', updated_at) = $loadedUpdatedAt
  RETURNING updated_at;
  ```

  An uncontended save adds no concurrency query. It runs the same parent update, revision insert and
  audit insert as today; the update's own row lock is the only lock added.

- **Reconcile only on a miss.** Revisions written after the loaded token decide the outcome.
- **Different fields merge silently. The same field refuses**, writing nothing and naming the field(s)
  and person, optionally with a count: "Mira changed the date after you opened this record. Reload to
  see their change." The code and message are Kenstack-owned.
- **Optional heads-up, no polling** (below).

## Token rules

1. **One database timestamp per write, taken after the row lock.** `$onUpdate` in `admin/table.ts`
   returns SQL instead of a JavaScript `Date`:

   ```sql
   greatest(date_trunc('milliseconds', clock_timestamp()),
            date_trunc('milliseconds', updated_at) + interval '1 millisecond')
   ```

   Postgres evaluates `SET` after it locks the row, so the token strictly advances, even for two saves
   in the same millisecond or a transaction that started earlier. `now()` is transaction start and is
   not used. Keep the timezone-aware column and UTC serialization.

2. **No writer sets `updatedAt` itself.** Remove the explicit sets so `$onUpdate` applies:
   `records/save.ts:339`, `admin/queries/save.ts:357` and `:424`, `admin/pageEditor/api.ts:41`,
   `admin/api/moduleSettings.ts:70`, `auth/handlers/resetPassword.ts:30`,
   `auth/email/change/api.tsx:409`; in Civic, `ticketPricing/fields/isDefault/server.ts:17`,
   `videoRentals/fields/editions/server.ts:308` and `:342`,
   `concessions/fields/locations/server.ts:152` and `:163`. Grep for others. A save that changes only
   relationship or custom-save fields leaves the parent's update data empty, and Drizzle throws
   `No values to set` on `.set({})` before `$onUpdate` applies (Astra, 30 September 2026). The
   conditional update must always set the token itself, e.g. `updated_at` from the SQL above.
3. **The revision carries the final token.** The save inserts its revision last and stamps
   `created_at` from the row in the same statement (`(SELECT updated_at FROM <table> WHERE id = $id)`),
   returning it. That is the save's final token even when a field handler updated the row again, such
   as Civic's `modules/users/volunteerStatusField.ts:17`. It costs no extra round trip.
4. **A write that moves the token writes a revision** (for participants, below). Today an empty change
   list skips the revision (`records/save.ts:403`) after the token has moved; such a save must not move
   the token.
5. **Compare at millisecond precision everywhere**, on `updated_at` and on `revisions.created_at`. Rows
   inserted through `defaultNow()` keep microseconds; truncation covers them.

## Save path

1. The edit loader returns `updatedAt`; the form sends it back in the save envelope, outside the field
   values. A record that did not exist at load (singleton, page, module settings) sends `null`.
2. `preSave` runs, then the conditional parent update. The update runs even when only relationships or
   media changed, so those saves participate. It requires `deleted_at IS NULL` for admin saves too, so a
   trashed record never matches.
3. On a miss, in the same transaction:
   1. `SELECT updated_at, deleted_at ... FOR UPDATE`. No row, or `deleted_at` set: refuse as deleted.
   2. Read the row's revisions with `created_at` after the loaded token (all of them when the token is
      `null`). Every participant writes its revision in the transaction that moves the token, so under
      Read Committed this statement sees whoever held the lock.
   3. The newest of those revisions must carry the current token. Otherwise the row changed without a
      revision, from a non-participating writer or from history older than these rules: refuse with
      the generic message, "This record changed after you opened it. Reload to see the current
      version." Missing history never counts as disjoint.
   4. Overlapping keys: refuse, naming the field(s) and person(s).
   5. Disjoint keys: apply the cross-field rule (Decisions for Ken), then run the parent update again
      without the token condition. The lock is held, so no loop is needed.
4. A refusal throws a Kenstack-owned conflict error. The transaction rolls back, including `preSave`
   writes such as Civic's ticket-pricing `isDefault` clearing other profiles. The existing catch in
   `records/save.ts` runs `afterFailure` (staged-media cleanup) and translates the error to the conflict
   code and message.
5. The refusal expires `adminLoadCacheTag(name, id)` with `{ expire: 0 }`, so Reload cannot show the
   same stale version.
6. A successful save returns the final token. The edit form adopts it together with its saved baseline
   (the reset in `admin/Edit/Form.tsx`), so its next save does not conflict with its own last one.

## Keys compared

- A save's keys are its `revisionChanges`, not the form's top-level `changes`. They are dotted for
  one-to-one relations (`movie.runtime`) and include keys the server adds, such as `publishedAt`
  (`admin/api/save.tsx:28`).
- One-to-one groups send nested dirty keys from the form's dirty state, and `admin/queries/save.ts`
  writes and records only those subfields. Today it diffs every submitted subfield against the
  database (`admin/queries/save.ts:242`), so a stale untouched subfield counts as a change and is
  written.
- Module settings sends its dirty keys like other forms. Today it sends none, so every key counts.

## Custom save paths

`saveRecord`'s `query` option replaces the default update. Each branch applies the same condition and
shares the miss handling:

- **Scoped reorder update** (`admin/queries/save.ts:419`): covered. Its derived `sortOrder` is computed
  from current data at save time.
- **Singleton upsert** (`admin/queries/save.ts:353`), **page editor** (`admin/pageEditor/api.ts:37`)
  and **module settings** (`admin/api/moduleSettings.ts:66`): covered. `ON CONFLICT DO UPDATE` carries
  the condition. A `null` token that meets an existing row is a miss, reconciled against all its
  revisions; this covers two concurrent first saves.
- **Site saves without a token** (account details, profile): skip the condition, but still move the
  token and write revisions, so admin editors see them.

## Other writers

Every write that moves a record's token belongs to one class:

- **Participant**: writes a revision with its keys in the same transaction. Record saves, and email
  change (`auth/email/change/api.tsx:408`) with key `email`. Snapshots never include secret columns.
- **Refuses stale editors** (the default; no code): moves the token without a revision, so a stale
  editor gets the generic refusal. Restore from trash (`admin/api/remove.ts:118`), password reset
  (`auth/handlers/resetPassword.ts:29`), payments customer linking (`payments/src/customer.ts:53`),
  ticket-pricing `isDefault` clearing on other profiles, and any writer the audit misses. A new writer
  is safe by default.
- **Deleted**: trashing sets `deleted_at`; the condition refuses the save as deleted.
- **Outside the token**: reorder (`admin/api/reorder.ts:75`) keeps `updatedAt` as it is
  (`updatedAt: table.updatedAt`, as `remove.ts:58` already does). No form writes `sortOrder` from its
  loaded values, and one reorder should not refuse every open editor in the list.
- **No token**: orders (`payments/src/tables.ts`) have no `updatedAt`; cancellation and subscription
  writes are their own workflow.

Audit Civic workflows that write their own tables: `modules/theatres/api.ts` (room use, screening
rules), `features/privateScreenings/screeningHold.ts`, `features/giving/accountNaming.ts` and
`features/pos/quickKeyPersistence.ts`. For each, confirm whether an edit form saves the same rows as an
owned relationship. If none does, the workflow is independent. If one does, the writer must move that
parent's token (the default class). Revisions from site writers would need a new Kenstack export, which
this plan does not add.

## Heads-up (optional)

When the editor's tab regains focus, one request asks for the row's revisions after the loaded token.
If there are any, a bar says "Mira saved changes to this record" with Reload. It keys on revisions, not
`updatedAt`, so writers without revisions do not prompt. Same pattern as todo 09's account-change check.

## After it lands

Shared media rows keep their own guard. Image and media-list saves update shared media metadata
(`fields/image/server.ts:190` and `:240`, `fields/mediaList/server.ts:312`), so two fields or two parent
records can write the same media row while their parent keys look disjoint. Keep the square-crop
comparison in `fields/internal/media/crop.ts:152`.

Audit other lower-level compare-and-swap checks, and remove one only when the record check covers every
writer of what it guards. Keep guards for other boundaries (authorization, ownership, upload
completion, media integrity).

## Decisions

### Cross-field rules after a merge — ruled A (Ken, 30 September 2026)

Ruled: option A. It is an edge case; refusing is always safe. B can replace it later if refusals on
these modules prove annoying.

**Situation.** A disjoint merge produces a row neither editor saw, and each save was validated alone. A
field-set `superRefine` that checks fields against each other can then be broken. Civic has three:
ticket pricing (a rule's ticket type must exist in the prices, `modules/ticketPricing/fields/index.ts:171`),
theatres (seats required when there is no seating code, `modules/theatres/fields.ts:78`) and concessions
(combo contents must match the kind and stocking, `modules/concessions/fields/index.ts:96`).

**Scenario.** Mira removes the Senior ticket type from a pricing profile. Jon, who opened the profile
earlier, adds a discount rule for Senior. `prices` and `rules` are different keys, so Jon's save merges,
leaving a rule for a ticket type that no longer exists. The form would never have accepted that.

**Options.**

- **A. One key group per refined field set.** On a record whose field set has a `superRefine`, any
  change by someone else counts as overlap. Costs: those three modules lose silent merging, so Jon is
  refused ("Mira changed the prices…") even when the edits were unrelated. No extra code or queries.
- **B. Re-validate the merged row.** On a disjoint miss, load the current record through the admin
  loader, bypassing its cache, overlay this save's changes and run the full schema. Refuse on failure
  with the rule's message and the other person's name. Costs: a record load and schema run in the
  save path, on a miss only; merging stays silent everywhere.
- **C. Refinements declare the keys they read.** A new field-set option lists the keys, and only those
  are grouped. Costs: a new Kenstack option that every refinement must keep accurate; a wrong list
  merges silently.

**Recommendation: A.** Conflicts are rare, a refusal is always safe and its message is true, and it
needs no new code path. B can replace it later if refusals on these modules prove annoying.

## Acceptance

- Two editors on the same record: different fields both save; the same field refuses the second with
  the field and person named; nothing is overwritten silently.
- Two saves in the same millisecond cannot both pass the condition.
- An uncontended save runs no additional concurrency query.
- Relationship-, media- and one-to-one-subfield saves participate; two editors changing different
  subfields of one relation both save.
- A refused save rolls back every write, including `preSave` writes, and cleans up staged objects.
- A trashed record refuses as deleted; a change without a revision refuses with the generic message.
- Reload after a refusal shows the other person's change.
- A form's second save after its own successful save succeeds.
- A merge that would break a cross-field rule never commits.

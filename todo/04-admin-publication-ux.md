# Admin publication UX normalization

Settled with Ken (2026-08-27/28) while designing the Content Composer. This file owns the host-neutral
Kenstack work; Composer persistence and host page/content decisions stay with the host site's planning.

## Settled design

- **`defineTable({ publish, seo })` is the single owner of both features** (landed 2026-09-03). It already provisions
  the columns; the duplicate `defineFields` booleans and `MetaFields.tsx` are eliminated. The flags
  serialize server→client to toggle the optional admin UI. Client validation is unaffected because the
  SEO fields are a fixed Kenstack-owned set: the admin client statically imports those
  `metaFieldOptions` definitions and merges them into the form schema when the flag is present.
- **Publication moved out of the form body into the header's Save control** (landed 2026-09-03; revised the same day from a separate action menu to one Save button whose icon is the status the next save commits and whose chevron menu stages another without saving; the generated status defaults to published, the unpublish confirmation is gone because Save is the commit, and no module may redeclare the generated fields: concessions replaced its use of the publication columns with an `available` flag),
  rendered only when the module's table has `publish`. Status wording stays honest per lifecycle: for
  a live row, Published means saves go live.
- **SEO moved into a shared Kenstack Dialog opened from the header** (landed 2026-09-03), gated on the table's `seo` flag
  and used identically by standard module forms and Composer (likely replacing Composer's Meta tab so
  both surfaces share one anatomy). Publish-time validation failures on hidden SEO fields badge and
  open the dialog, the same landing rule Composer uses for block errors.
- **The edit header's action row is pinned** (landed 2026-09-03, with Cmd/Ctrl+S). Staff feedback (2026-08-28): forms are filled top to
  bottom and Save must stay reachable at the end. Sticky within the admin scroll container with an
  opaque background and the existing bottom border; breadcrumbs scroll away; the Composer shell gets
  the identical treatment; add a Cmd/Ctrl+S save shortcut alongside.
- **Explicit Save everywhere; no admin auto-save** (unchanged by the 2026-09-03 pass). Composer's prototype auto-save was removed
  (2026-08-28). Auto-save may return once draft isolation exists: draft saves would overwrite the
  draft in place with revisions written at publish or coalesced per session, so revision pollution is
  not the blocker.
- **Touch-safe drag activation** (review finding, 2026-08-28; landed 2026-09-03): `SortableList`
  gained `activator="handle"`, under which only a `SortableHandle` grip inside the item starts a drag
  and carries the listeners, attributes, and `touch-none`. Composer outline cards and the admin list
  reorder use it; the admin list dropped its native HTML5 drag events for the shared component, with
  subgrid row wrappers and one list per group so scoped reorder cannot cross groups. `MediaListField`
  keeps whole-tile drag on `MouseSensor` (distance) plus press-delay `TouchSensor` with the blanket
  `touch-none` dropped, so scroll wins unless the user holds to drag.

## Deferred: record-wide draft isolation

A record-wide "published row plus divergent pending draft" primitive is deliberately later work. The
preferred model is a pending (unapplied) revision snapshot: the live row stays canonical, so public
queries, foreign keys, join-table field side effects, and cache tags are untouched; publish becomes the
existing save path fed from the stored snapshot; and the retained snapshot doubles as the storage real
scheduled publishing needs. A row-per-state alternative (status-plus-key rows, as Sanity and WordPress
use) was considered and rejected for relational leakage into unique indexes, foreign keys, and list
queries. Do not build any of this before the new db/query primitives land. The end state is that
content-bearing modules gain drafts while operational modules deliberately keep save-is-live.

## Verification gate

The pinned header, publication control, SEO dialog, and drag activation are interaction changes:
implement them against a working browser build and verify the longest module form plus the Composer
shell. Removing `MetaFields.tsx` requires the replacement header control in the same pass so no module
loses its visibility control.

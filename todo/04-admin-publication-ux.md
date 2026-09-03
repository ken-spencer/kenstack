# Admin publication UX normalization

Settled with Ken (2026-08-27/28) while designing the Content Composer. This file owns the host-neutral
Kenstack work; Composer persistence and host page/content decisions stay with the host site's planning.

## Settled design

- **`defineTable({ publish, seo })` becomes the single owner of both features.** It already provisions
  the columns; the duplicate `defineFields` booleans and `MetaFields.tsx` are eliminated. The flags
  serialize server→client to toggle the optional admin UI. Client validation is unaffected because the
  SEO fields are a fixed Kenstack-owned set: the admin client statically imports those
  `metaFieldOptions` definitions and merges them into the form schema when the flag is present.
- **Publication moves out of the form body into a shared header control with action semantics,**
  rendered only when the module's table has `publish`. Publish and Publish unlisted save immediately
  (honest for the single live row, where saves go live anyway); Unpublish keeps its confirmation;
  Schedule expands inside the control's popover. The Composer shell already demonstrates the control.
  Status wording stays honest per lifecycle: for a live row, Published means saves go live.
- **SEO moves into a shared Kenstack Dialog opened from the header,** gated on the table's `seo` flag
  and used identically by standard module forms and Composer (likely replacing Composer's Meta tab so
  both surfaces share one anatomy). Publish-time validation failures on hidden SEO fields badge and
  open the dialog, the same landing rule Composer uses for block errors.
- **The edit header's action row is pinned.** Staff feedback (2026-08-28): forms are filled top to
  bottom and Save must stay reachable at the end. Sticky within the admin scroll container with an
  opaque background and the existing bottom border; breadcrumbs scroll away; the Composer shell gets
  the identical treatment; add a Cmd/Ctrl+S save shortcut alongside.
- **Explicit Save everywhere; no admin auto-save.** Composer's prototype auto-save was removed
  (2026-08-28). Auto-save may return once draft isolation exists: draft saves would overwrite the
  draft in place with revisions written at publish or coalesced per session, so revision pollution is
  not the blocker.
- **Touch-safe drag activation** (review finding, 2026-08-28): `SortableItem` currently puts
  `touch-none` and the drag listeners on the whole item, so touch scrolling is blocked over Composer
  outline cards and media tiles. The outline card's grip icon becomes the dnd-kit activator via
  `setActivatorNodeRef` (listeners, attributes, and `touch-none` move onto the grip); `MediaListField`
  keeps whole-tile drag but switches to `MouseSensor` (distance) plus press-delay `TouchSensor` with
  the blanket `touch-none` dropped, so scroll wins unless the user holds to drag.

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

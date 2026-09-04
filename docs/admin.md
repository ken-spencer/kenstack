# Admin Reference

Consult this reference for Kenstack admin modules, lists, edit forms, admin-specific validation
ownership, record saving, list configuration, relationship interfaces, and visual structure. Shared form
construction, controls, and state follow `docs/forms.md`.

## One-to-Many Relationships

Before implementing a new one-to-many admin relationship, decide whether staff should manage it as a
Child Module or an embedded custom field from how they work with it, not from relational storage,
foreign keys, or generic CRUD support.

- Use an embedded field when descendants are normally created, reviewed, and changed with the parent.
  The rows may remain relational; Event Dates & Times and Ticket Pricing are established patterns.
- Use a Child Module when children need an independent list, search, bulk operations, permissions,
  navigation, large-scale management, or a lifecycle that would make the parent editor misleading.
- Direct operational lookup, including barcode lookup, does not by itself require a Child Module.
- Confirm the save boundary, permissions, audit and revision behavior, deletion, expected scale, and
  navigation for either choice.

## Visual Structure

- Inside an existing section border, use spacing, headings, dividers, or a subtle background; a nested
  bordered panel is for a distinct repeated record.
- Use `border-[var(--admin-divider)]`, or its side-specific equivalent, for structural admin borders,
  and the generic border color for fields and controls.

## Edit Form Layout

- Follow the established two-column admin edit rhythm: primary identity fields first (`name`, `title`,
  `slug`, `code`); right-column operational and meta fields next on mobile (visibility, publish date,
  module-specific selectors); long content fields (description, body, details) after those controls.
- Preserve that mobile order while keeping the desktop layout independent of it.
- Keep the primary and right columns as independent layout regions, so the desktop description or
  content area sits directly under the primary identity fields while the right column stays beside
  them; a shared grid that makes later left-column fields wait for the full sidebar height breaks this.
- Keep right-column fields narrow and operational; long text, rich content, and large repeated controls
  belong in the primary column.
- When independent fields share a grid or flex row, align the row's children to the start with
  `items-start` at the same responsive breakpoint, because labels, descriptions, help text, and
  validation messages can make one field taller. Use another alignment only when it stays intentional
  and stable as those elements appear.

## Validation Ownership

- Keep validation messages as short sentence-case fragments without trailing periods, such as
  `Enter a valid date like June 25, 2026`.
- The field schema owns field-value validation. Before adding `preSave` validation, trace the submitted
  value through the form and schema and state why those boundaries cannot enforce the requirement.
  `preSave` is for correctness that depends on current server state, where accepting a stale submission
  has a meaningful consequence; a hypothetical race or an extra layer of checking is not that.
- Use the shared `Field` and `FormControl` components for a custom control that represents one
  registered field; they own the field message and accessible `aria-invalid` / `aria-describedby`
  wiring. When a composite or repeated control must use React Hook Form controllers directly because
  one field wrapper cannot represent its nested error paths, render each relevant error with the shared
  `FieldErrorMessage` beside the affected control and wire that control's invalid and described-by
  state to the message. A custom control bypassing the standard field wrapper is not evidence that
  schema validation is missing.
- Use `Combobox` for the standard searchable options interaction, `ComboboxRoot` with the named
  combobox parts for custom composition, and `ComboboxField` when the standard control connects
  directly to React Hook Form. Domain fields compose the lowest suitable shared control and keep its
  keyboard, filtering, selection, and clear behavior.

## Generated Fields

- Module form-component generation, client registration, settings forms, and import direction follow
  `docs/module-anatomy.md`; reusable field and component boundaries follow
  `docs/kenstack-anatomy.md#field-library`.
- `defineTable({ publish, seo })` owns the publication and SEO fields. `defineModule(...)` and the admin
  edit context add `visibility`, `publishedAt`, `seoTitle`, `seoDescription`, and `ogImage` from the
  table (a module field sharing one of those names is rejected at definition), the edit header's Save
  control shows the status its next save commits and its menu stages another, the header renders
  the Search & sharing dialog, and module edit forms render none of them. A module whose records carry a different concept, such as
  sales availability, declares its own field under its own name instead of reusing these.
- Put invariant control configuration on the field definition. Kind-specific options such as combobox
  choices and empty-state copy, or number bounds and step size, travel with the field and are not
  render-site overrides. Explicit labels and descriptions are field-owned too; generated controls
  derive a label from the field name only when none is configured. Render props carry local
  presentation such as layout classes, contextual help, and interaction state.
- Field-specific server behavior registered through `admin.fieldServers` needs no matching custom
  component. Keep the field's built-in editor unless editing that field's own value requires a
  different control.
- Configure `imageField({ selectVariant: "original" })` when record loads need the original image in
  place of the default square selection, and a file field's empty-state instruction with
  `placeholder`; the built-in editor owns its standard replacement instruction. Neither variation needs
  a new field kind or component.
- A component registered for a field property represents that field and consumes its supplied `name`.
  A custom component is warranted when the field's own value requires a specialized control. Compound
  editors may read or update sibling values, but their owned value cannot be bound to an embedded
  property path.
- One-to-one edit forms receive the bare relation `fields` and their `prefix` through the client
  configuration. Resolve and generate ordinary relation controls inside the relation form, where their
  components are owned; when a bespoke panel renders only a subset, generate that subset and pass the
  same prefix or full field names into its custom controls.
- A one-to-one kind's server and client entries, their registration by canonical key in
  `admin.oneToOne`, and which fields stay in the parent `EditForm` follow
  `docs/module-anatomy.md#one-to-one-kind-units`. The registration key is the persisted discriminator,
  and the first registered relation is the default. The host table declares the persisted `kind`
  column; `defineModule(...)` adds the reserved field to the resolved map, schema, defaults, list, and
  filters, so it is never declared or rendered as an ordinary parent field.
- Use `relationshipField({ mode: "single" })` for a scalar foreign-key selector. The field name
  identifies a directly persisted table column with exactly one single-column foreign key to the `id`
  of exactly one registered admin-list module; Kenstack derives the searchable options, labels, and
  order from that target module. The default mode remains `"multiple"`, and many-to-many fields
  continue to pair the isomorphic definition with `relationshipField(relationship)` from
  `@kenstack/fields/server`.

## Record Saving

- Use `saveModuleRecord({ module, fields, id, changes, values })` for authenticated site actions that
  update records also managed in admin, such as a public profile or account-details form. Import it
  from `@kenstack/admin/queries/save`. Authenticate and authorize the target record in the action;
  for a self-service form, derive `id` from the authenticated user, never the submitted payload.
  Pass only the action's permitted values and restricted server field set, preserving the relevant
  field handlers. Return only permitted saved values, not the full admin record.
- `saveModuleRecord` and `saveAdminRecord` share the module's persistence and `admin.revalidate`
  rules. Their record and list tags expire after commit, before follow-up tasks and audit logging.
  Declare additional content dependencies once in `admin.revalidate`; public forms do not duplicate
  that tag list. Session snapshots also carry the users record tag, so module saves and removals need
  no site-level session-invalidation callback.
- Public cached reads of an individual module record can use `adminLoadCacheTag(module.name, id)`
  from `@kenstack/admin/cache` to share that invalidation. This shares a tag, not the admin query's
  payload or cache entry: select the public form's fields and keep authentication outside the cache.
  `loadRecord` itself does not cache reads.
- Use `saveAdminRecord({ module, id, changes, values })` for the standard admin module save path after
  the pipeline has enforced `access: "admin"`. It supplies admin-save authority to field handlers and
  never infers authority from the user's roles.
- Use `saveRecord(...)` directly for custom persistence no module represents, such as settings or
  page-editor upserts. It is restricted by default; set `admin: true` only in a backend admin action,
  never from request data or user roles.
- Keep direct writes when the module save cannot express a required transaction, unauthenticated
  submission, or conflict-handling contract. They bypass module revalidation: expire the affected
  module, record, and list dependencies explicitly after commit, before follow-up work. Do not split
  an atomic operation just to use the module save helper.

## List Config

- In admin lists, render record-title links with `ListTitle` from `@kenstack/admin/components/ListTitle`,
  which sizes the link to its visible text so no invisible click target stretches across empty flex
  or grid space.
  When the whole row should navigate, implement an explicit accessible row interaction.
- Configure list behavior on field definitions with field options such as `list`, `filter`, and `sort`.
  Module-level `admin.list.sort`, `admin.list.filters`, and similar explicit list maps are escape
  hatches for custom behavior field options cannot express, and never repeat a field-level
  `sort: true`.
- List rows carry only `id`, timestamps, `visibility` when the table publishes, fields flagged `list`,
  and `admin.list.select` columns; the
  edit load carries only defined fields plus `admin.select` columns. When a custom list item or edit UI
  displays data no editable field owns, such as submitted inquiry columns, add those columns to the
  matching select in place of placeholder fields.
- Use `admin.list.reorder` when the module has an explicit ordering field; it is separate from ordinary
  sortable field configuration. `defineTable({ reorder: true })` provisions the standard `sortOrder`
  column and index only. `admin.list.reorder: true` uses one active-record sequence for the table, while
  `admin.list.reorder.scope` gives each required foreign-key value its own sequence. Module saves assign
  positions through that configured list behavior; direct database writes only receive the column
  default.
- On a top-level module, a scoped reorder automatically selects its scope field and related record
  title for the list and keeps groups contiguous. For a scope such as `categoryId`, the title is
  available as `category`; an explicit list selection with that name overrides the default. The
  required single-column foreign key identifies the related admin module, whose record title, route,
  and default list order supply the group heading. The scope references the related module's `id` and
  is a directly saved module field. A child module's list is already scoped by its parent, so it takes
  no `reorder.scope`. Add a scope-plus-order composite index in the host table when the expected list
  size warrants it.
- The admin list reorder interface owns reorder values such as `sortOrder`: keep the database column,
  enable `admin.list.reorder`, and leave the field out of module `fields.ts` definitions and admin edit
  forms.

# Admin Reference

Consult this reference for Kenstack admin modules, lists, edit forms, field validation ownership, form
state, record saving, list configuration, relationship interfaces, and visual structure.

## One-to-Many Relationships

Before implementing a new one-to-many admin relationship, confirm whether staff should manage it as a
Child Module or an embedded custom field. Do not infer the interface from relational storage, foreign
keys, or generic CRUD support.

- Prefer an embedded field when descendants are normally created, reviewed, and changed with the parent.
  The rows may remain relational; Event Dates & Times and Ticket Pricing are established patterns.
- Use a Child Module when children need an independent list, search, bulk operations, permissions,
  navigation, large-scale management, or a lifecycle that would make the parent editor misleading.
- Direct operational lookup, including barcode lookup, does not by itself require a Child Module.
- Confirm the save boundary, permissions, audit and revision behavior, deletion, expected scale, and
  navigation for either choice.

## Visual Structure

- Avoid nested bordered panels. Inside an existing section border, prefer spacing, headings, dividers, or
  a subtle background unless a child is a distinct repeated record.
- Use `border-[var(--admin-divider)]`, or its side-specific equivalent, for structural admin borders.
  Reserve the generic border color for fields and controls.

## Edit Form Layout

- Follow the established two-column admin edit rhythm:
  - primary identity fields first, such as `name`, `title`, `slug`, or `code`;
  - right-column operational/meta fields next on mobile, such as visibility, publish date, and module-specific selectors;
  - long content fields, such as description/body/details, after those controls.
- Preserve that mobile order without making the desktop layout codependent.
- Do not put the primary column and right column into a shared grid where later left-column fields are forced to wait for the full sidebar height.
- Keep columns as independent layout regions. Use a structure that allows the desktop description/content area to sit directly under the primary identity fields while the right column remains beside them.
- Keep right-column fields narrow and operational. Avoid putting long text, rich content, or large repeated controls there.
- When independent fields share a grid or flex row, align the row's children to the start with
  `items-start` at the same responsive breakpoint. Labels, descriptions, help text, and validation
  messages can make one field taller; use another alignment only when it remains intentional and stable
  as those elements appear.

## Validation Ownership

- Keep validation messages as short sentence-case fragments without trailing periods, such as
  `Enter a valid date like June 25, 2026`.
- Treat the field schema as the owner of field-value validation. Before adding `preSave` validation, trace the submitted value through the form and schema and state why those boundaries cannot enforce the requirement. Use `preSave` only when correctness depends on current server state and accepting a stale submission would have a meaningful consequence; a hypothetical race or extra layer of checking is not sufficient.
- Prefer the shared `Field` and `FormControl` components for a custom control that represents one registered field; they own the field message and accessible `aria-invalid` / `aria-describedby` wiring. When a composite or repeated control must use React Hook Form controllers directly because one field wrapper cannot represent its nested error paths, render each relevant error with the shared `FieldErrorMessage` beside the affected control and wire that control's invalid and described-by state to the message. Do not infer that schema validation is missing merely because a custom control bypasses the standard field wrapper that normally presents those errors.

## Form State

- Before adding local state, refs, maps, or context to preserve form data, inspect React Hook Form's
  default, reset, unregister, and retention behavior. Do not mirror form defaults; if the library appears
  insufficient, demonstrate the missing capability before adding another owner.
- Treat React Hook Form `reset` and `resetField` as baseline-changing operations: they redefine the values considered saved and can clear dirty state. Reserve them for loading a different record, accepting a successful save response, or an explicit revert. When synchronizing browser or query state into a form without replacing the loaded record baseline, use `setValue` and choose `shouldDirty`, `shouldTouch`, and `shouldValidate` deliberately. Do not reset a field merely to add or update externally supplied options while the user may have unsaved edits.
- Treat form `defaultValues` as initial state, not a reactive reset mechanism. Prefer module-scope constants
  for static defaults when they naturally live outside render or are reused for explicit resets, and pass
  server-derived defaults through serialized props when they depend on server data. Do not add `useMemo`
  only to stabilize `defaultValues`; use a key or remount at the record or route-input boundary when
  changing defaults should reset the form. When a form must reset after submit, do it explicitly from the
  mutation or navigation path.

## Record Saving

- Use `saveModuleRecord({ module, fields, id, changes, values })` for authenticated site actions that update a module record and need the module's persistence and cache revalidation with restricted field authority. Pass the action's restricted server field set so returned values cannot include admin-only fields.
- Use `saveAdminRecord({ module, id, changes, values })` for the standard admin module save path after the pipeline has enforced `access: "admin"`. The function supplies admin-save authority to field handlers; it does not infer authority from the user's roles.
- Use `saveRecord(...)` directly for custom persistence that is not represented by a module, such as settings or page-editor upserts. It is restricted by default. Set `admin: true` only in a backend admin action, never from request data or user roles.

## List Config

- In admin lists, keep record-title links sized to their visible text instead of stretching an invisible
  click target across empty flex or grid space. Use `self-start` with `max-w-full` when the title must
  truncate. When the whole row should navigate, implement an explicit accessible row interaction.
- Prefer configuring list behavior on field definitions with field options such as `list`, `filter`, and `sort`.
- Treat module-level `admin.list.sort`, `admin.list.filters`, and similar explicit list maps as escape hatches for custom behavior that field options cannot express.
- Use `admin.list.reorder` when the module has an explicit ordering field; that is separate from ordinary sortable field configuration.
- `defineTable({ reorder: true })` provisions the standard `sortOrder` column and index only.
  `admin.list.reorder: true` uses one active-record sequence for the table, while
  `admin.list.reorder.scope` gives each required foreign-key value its own sequence. Module
  saves assign positions through that configured list behavior; direct database writes only receive the
  column default.
- On a top-level module, a scoped reorder automatically selects its scope field and related record title for the list and keeps
  groups contiguous. For a scope such as `categoryId`, the title is available as `category`; an explicit
  list selection with that name overrides the default. The required single-column foreign key identifies
  the related admin module; Kenstack uses that module's record title, route, and default list order for
  the group heading. The scope must reference the related module's `id` and be a directly saved module
  field. Do not configure `reorder.scope` on a child module; its list is already scoped by its parent.
  Add a scope-plus-order composite index in the host table when the expected list size warrants it.
- Do not create reorder fields, such as `sortOrder`, in module `fields.ts` definitions or render them as manually editable fields in admin edit forms. Keep the database column, enable `admin.list.reorder`, and let the admin list reorder interface own those values.
- Do not duplicate field-level `sort: true` entries in `admin.list.sort`.

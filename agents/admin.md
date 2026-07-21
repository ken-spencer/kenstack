# Admin Instructions

Read this before Kenstack admin module, list, or edit-form work.

## Edit Form Layout

- Follow the established two-column admin edit rhythm:
  - primary identity fields first, such as `name`, `title`, `slug`, or `code`;
  - right-column operational/meta fields next on mobile, such as visibility, publish date, and module-specific selectors;
  - long content fields, such as description/body/details, after those controls.
- Preserve that mobile order without making the desktop layout codependent.
- Do not put the primary column and right column into a shared grid where later left-column fields are forced to wait for the full sidebar height.
- Keep columns as independent layout regions. Use a structure that allows the desktop description/content area to sit directly under the primary identity fields while the right column remains beside them.
- Keep right-column fields narrow and operational. Avoid putting long text, rich content, or large repeated controls there.

## Validation Ownership

- Treat the field schema as the owner of field-value validation. Before adding `preSave` validation, trace the submitted value through the form and schema and state why those boundaries cannot enforce the requirement. Use `preSave` only when correctness depends on current server state and accepting a stale submission would have a meaningful consequence; a hypothetical race or extra layer of checking is not sufficient.
- Prefer the shared `Field` and `FormControl` components for a custom control that represents one registered field; they own the field message and accessible `aria-invalid` / `aria-describedby` wiring. When a composite or repeated control must use React Hook Form controllers directly because one field wrapper cannot represent its nested error paths, render each relevant error with the shared `FieldErrorMessage` beside the affected control and wire that control's invalid and described-by state to the message. Do not infer that schema validation is missing merely because a custom control bypasses the standard field wrapper that normally presents those errors.

## Form State

- Treat React Hook Form `reset` and `resetField` as baseline-changing operations: they redefine the values considered saved and can clear dirty state. Reserve them for loading a different record, accepting a successful save response, or an explicit revert. When synchronizing browser or query state into a form without replacing the loaded record baseline, use `setValue` and choose `shouldDirty`, `shouldTouch`, and `shouldValidate` deliberately. Do not reset a field merely to add or update externally supplied options while the user may have unsaved edits.

## Record Saving

- Use `saveModuleRecord({ module, fields, id, changes, values })` for authenticated site actions that update a module record and need the module's persistence and cache revalidation with restricted field authority. Pass the action's restricted server field set so returned values cannot include admin-only fields.
- Use `saveAdminRecord({ module, id, changes, values })` for the standard admin module save path after the pipeline has enforced `access: "admin"`. The function supplies admin-save authority to field handlers; it does not infer authority from the user's roles.
- Use `saveRecord(...)` directly for custom persistence that is not represented by a module, such as settings or page-editor upserts. It is restricted by default. Set `admin: true` only in a backend admin action, never from request data or user roles.

## List Config

- Prefer configuring list behavior on field definitions with field options such as `list`, `filter`, and `sort`.
- Treat module-level `admin.list.sort`, `admin.list.filters`, and similar explicit list maps as escape hatches for custom behavior that field options cannot express.
- Use `admin.list.reorder` when the module has an explicit ordering field; that is separate from ordinary sortable field configuration.
- Do not create reorder fields, such as `sortOrder`, in module `fields.ts` definitions or render them as manually editable fields in admin edit forms. Keep the database column, enable `admin.list.reorder`, and let the admin list reorder interface own those values.
- Do not duplicate field-level `sort: true` entries in `admin.list.sort`.

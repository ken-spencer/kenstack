# Admin Instructions

Read this before Kenstack admin module, list, or edit-form work.

## Edit Form Layout

- Follow the established two-column admin edit rhythm:
  - primary identity fields first, such as `name`, `title`, `slug`, or `code`;
  - right-column operational/meta fields next on mobile, such as visibility, publish date, module-specific selectors, and sort order;
  - long content fields, such as description/body/details, after those controls.
- Preserve that mobile order without making the desktop layout codependent.
- Do not put the primary column and right column into a shared grid where later left-column fields are forced to wait for the full sidebar height.
- Keep columns as independent layout regions. Use a structure that allows the desktop description/content area to sit directly under the primary identity fields while the right column remains beside them.
- Keep right-column fields narrow and operational. Avoid putting long text, rich content, or large repeated controls there.

## List Config

- Prefer configuring list behavior on field definitions with field options such as `list`, `filter`, and `sort`.
- Treat module-level `admin.list.sort`, `admin.list.filters`, and similar explicit list maps as escape hatches for custom behavior that field options cannot express.
- Use `admin.list.reorder` when the module has an explicit ordering field; that is separate from ordinary sortable field configuration.
- Do not render reorder fields, such as `sortOrder`, as manually editable fields in admin edit forms. They are edited through the list reorder interface.
- Do not duplicate field-level `sort: true` entries in `admin.list.sort`.

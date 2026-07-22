# UI Instructions

Read this before UI, styling, Tailwind, or shared component work.

## Styling

- Use Tailwind utilities.
- Prefer existing shared components before adding new ones.
- Keep class names compatible with Prettier/Tailwind sorting.
- Shared components live directly under `src/components`.
- Keep shared UI behavior in Kenstack-owned components with narrow APIs.
- In admin lists, keep record-title links sized to their visible text instead
  of allowing a flex or grid parent to stretch an invisible click target across
  empty cell space. Use `self-start` with `max-w-full` when the title must still
  truncate. If the whole row should navigate, implement that as an explicit,
  accessible row interaction rather than stretching only the title anchor.
- When independent form fields share a grid or flex row, align the row's
  children to the start with `items-start` at the same responsive breakpoint.
  Labels, descriptions, help text, and validation messages can make one field
  taller; default stretch alignment must not shift or spread out a neighboring
  field's controls. Use another alignment only when it is intentional and
  remains stable when any field in the row shows validation.

## React APIs

- Before adding or changing React API patterns in shared controls or client UI primitives, check the installed React version and current React docs when the API may have changed. Do not introduce deprecated React API patterns when the current docs recommend a simpler project-compatible syntax, such as passing `ref` as a prop instead of using `React.forwardRef`.

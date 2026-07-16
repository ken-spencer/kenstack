# UI Instructions

Read this before UI, styling, Tailwind, or shared component work.

## Styling

- Use Tailwind utilities.
- Prefer existing shared components before adding new ones.
- Keep class names compatible with Prettier/Tailwind sorting.
- Shared components live directly under `src/components`.
- Keep shared UI behavior in Kenstack-owned components with narrow APIs.
- When independent form fields share a grid or flex row, align the row's
  children to the start with `items-start` at the same responsive breakpoint.
  Labels, descriptions, help text, and validation messages can make one field
  taller; default stretch alignment must not shift or spread out a neighboring
  field's controls. Use another alignment only when it is intentional and
  remains stable when any field in the row shows validation.

## React APIs

- Before adding or changing React API patterns in shared controls or client UI primitives, check the installed React version and current React docs when the API may have changed. Do not introduce deprecated React API patterns when the current docs recommend a simpler project-compatible syntax, such as passing `ref` as a prop instead of using `React.forwardRef`.

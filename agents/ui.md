# UI Instructions

Read this before UI, styling, Tailwind, or shared component work.

## Styling

- Use Tailwind utilities.
- Prefer existing shared components before adding new ones.
- Keep class names compatible with Prettier/Tailwind sorting.
- Shared components live directly under `src/components`.
- Keep shared UI behavior in Kenstack-owned components with narrow APIs.

## React APIs

- Before adding or changing React API patterns in shared controls or client UI primitives, check the installed React version and current React docs when the API may have changed. Do not introduce deprecated React API patterns when the current docs recommend a simpler project-compatible syntax, such as passing `ref` as a prop instead of using `React.forwardRef`.

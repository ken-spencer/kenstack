# Forms

Consult this reference for Kenstack forms, shared form controls, React Hook Form state, dependent fields,
and client-side form validation in Kenstack and host sites.

## Form Construction

- For submitted forms, use Kenstack `Form` and the existing Kenstack field components as the starting
  point. React Hook Form is the canonical client-side owner of user-editable submitted values.
- Read dependent values with `watch` or `useWatch` and derive conditional UI, available options,
  validation inputs, eligibility, and displayed totals from the current form values. Do not mirror form
  fields, copy field snapshots between steps, or store derived form values separately in component
  state.
- Local component state is for transient UI state that is not submitted, such as whether a disclosure or
  modal is open. Server-, query-, or transaction-owned state remains with its existing owner and should
  not be copied into React Hook Form merely because it affects the form.
- Before adding site-local form infrastructure or controls, inspect the available Kenstack form
  components and APIs. If a required capability is missing, surface the gap and recommend whether it
  belongs in Kenstack as a reusable enhancement or in the current site as a site-specific feature. Do
  not implement either without explicit authorization from the task or project instructions.

## Form State

- Before adding local state, refs, maps, or context to preserve form data, inspect React Hook Form's
  default, reset, unregister, and retention behavior.
- Treat React Hook Form `reset` and `resetField` as baseline-changing operations: they redefine the values
  considered saved and can clear dirty state. Reserve them for loading a different record, accepting a
  successful save response, or an explicit revert. When synchronizing browser or query state into a form
  without replacing the loaded record baseline, use `setValue` and choose `shouldDirty`, `shouldTouch`,
  and `shouldValidate` deliberately. Do not reset a field merely to add or update externally supplied
  options while the user may have unsaved edits.
- Treat form `defaultValues` as initial state, not a reactive reset mechanism. Prefer module-scope
  constants for static defaults when they naturally live outside render or are reused for explicit
  resets, and pass server-derived defaults through serialized props when they depend on server data. Do
  not add `useMemo` only to stabilize `defaultValues`; use a key or remount at the record or route-input
  boundary when changing defaults should reset the form. When a form must reset after submit, do it
  explicitly from the mutation or navigation path.
- Keep independently persisted values as ordinary fields when one value changes the presentation of
  another. Watch the driving value in the form or a small form section, then conditionally render the
  dependent field or pass the watched state into its editor. Cross-field presentation logic does not
  justify a custom field kind or a component that owns both values.

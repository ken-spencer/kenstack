# Forms

Consult this reference for Kenstack forms, shared form controls, React Hook Form state, dependent fields,
and client-side form validation in Kenstack and host sites.

## Form Construction

- Align field labels and controls to the top by default. Descriptions and validation messages grow
  below the controls without vertically centering or spreading shorter neighboring fields.
- For submitted forms, start from Kenstack `Form` and the existing Kenstack field components. React
  Hook Form is the canonical client-side owner of user-editable submitted values.
- A multi-step workflow is an aggregate of forms by default: each step that collects and validates
  submitted fields owns its `Form`, schema, and defaults, and publishes its validated result to the
  workflow owner only when completion, summaries, or later steps need that committed result. Use a
  standalone `FormProvider` when a step has fields but advances through another validated action, such
  as choosing an available reservation block. Share one provider across steps only when they
  deliberately edit one atomic form and every submitting step should validate its complete schema. The
  surrounding workflow follows the composition, navigation, and persistence contract in
  `docs/step-flow.md`.
- `FormProvider` supplies the React Query provider its mutation requires, so a form needs no
  `QueryProvider` of its own; keep an outer provider only when a component calls a query hook before the
  form provider is mounted.
- Read dependent values with `watch` or `useWatch` and derive conditional UI, available options,
  validation inputs, eligibility, and displayed totals from the current form values; live form fields
  and derived form values have no second copy in component state. A validated result committed by a
  completed step is a distinct workflow state, not a second owner for that step's live edits.
- Local component state is for transient UI state that is not submitted, such as whether a disclosure
  or modal is open. Server-, query-, or transaction-owned state remains with its existing owner even
  when it affects the form.
- Before adding site-local form infrastructure or controls, inspect the available Kenstack form
  components and APIs. When a required capability is missing, surface the gap and recommend whether it
  belongs in Kenstack as a reusable enhancement or in the current site as a site-specific feature;
  implementing either needs explicit authorization from the task or project instructions.

## Errors and Status

- Route every form-submission outcome through the status outlet rendered by `Form`. The outlet
  displays mutation errors, form-level schema and server errors, and errors for fields that are not
  currently rendered; rendered fields display their own errors inline.
- When submission work runs outside the form's mutation, report its outcome with `setStatusMessage`.
  The `onSubmit` and `onBlur` callbacks receive it, and descendant components reach it through
  `useForm()` from `@kenstack/forms/context`.
- Each submission outcome has one display owner; a sibling notice, alert, or status element would
  duplicate the form outlet and produce competing messages for the same failure.
- Use page-level notices for state independent of a particular submission, such as availability
  failures loaded outside the form or a hold that had already expired.

## Form State

- Before adding local state, refs, maps, or context to preserve form data, inspect React Hook Form's
  default, reset, unregister, and retention behavior.
- React Hook Form `reset` and `resetField` are baseline-changing operations: they redefine the values
  considered saved and can clear dirty state. Reserve them for loading a different record, accepting a
  successful save response, or an explicit revert. To synchronize browser or query state into a form
  without replacing the loaded record baseline, use `setValue` and choose `shouldDirty`, `shouldTouch`,
  and `shouldValidate` deliberately; adding or updating externally supplied options never resets a
  field while the user may have unsaved edits.
- Form `defaultValues` are initial state, not a reactive reset mechanism. Keep static defaults as
  module-scope constants when they naturally live outside render or are reused for explicit resets, and
  pass server-derived defaults through serialized props. When changing defaults should reset the form,
  use a key or remount at the record or route-input boundary; `useMemo` is never added only to
  stabilize `defaultValues`. When a form must reset after submit, do it explicitly from the mutation or
  navigation path.
- Preserve unfinished form values when React or Next.js hides the form with `Activity`; moving away
  does not by itself end the user's draft. A successful create does end its new-entry transaction:
  reset that form to its empty defaults in the success handler before navigating away, so reopening the
  cached new-entry route cannot show the record already created. Kenstack's admin editor owns this for
  standard modules; custom create flows do the same at their own successful-create boundary.
- Keep independently persisted values as ordinary fields when one value changes the presentation of
  another. Watch the driving value in the form or a small form section, then conditionally render the
  dependent field or pass the watched state into its editor. Cross-field presentation logic does not
  justify a custom field kind or a component that owns both values.

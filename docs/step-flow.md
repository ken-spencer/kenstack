# StepFlow

Consult this reference for Kenstack `StepFlow`, multi-step workflow composition, step navigation,
summaries, and browser persistence in Kenstack and host sites.

## Step ownership

- A reusable step is a capability bundle that owns its title, content, form or action behavior,
  supporting server loaders and save handlers, and optional always-mounted controller. Keep these
  pieces in one unit under the owning module or feature; a step does not have to live in `components/`.
  It exports one complete step definition or factory. A flow assembles and orders those definitions;
  the step's content and controller travel together. Framework routes delegate to the unit's handlers.
- In a server-composed application, keep complete step factories in a server-safe module and
  interactive step implementations in client modules. The server route invokes only server-safe
  factories, which may include client components in their step definitions; client hooks live in those
  client components. Pass factory results directly into the `steps` registry: StepFlow resolves all
  entries concurrently and omits entries that resolve to `null`, so the call site neither awaits a
  factory nor binds its resolved step. A client-exported factory is never invoked from the server, and
  the flow assembler stays server-side.
- A step owns its form, schema, defaults, validation, and transient interface state. Apply the
  form-state rules in `docs/forms.md`; a workflow is an aggregate of forms unless its steps deliberately
  edit one atomic submitted value. A specialized step composes the default step's owned pieces and
  behavior, adding only its required differences. Reuse by that specialization does not itself move
  ownership into a broader shared area. A schema used by the step's own API remains step-owned:
  crossing a server/client boundary does not establish a separate domain owner. General record fields,
  tables, and contracts with an independent domain purpose stay with their domain owner. Runtime
  boundaries still apply within the bundle: server loaders and handlers stay in server-only files,
  and schemas shared with the form stay isomorphic.
- Pass a step only the current inputs its own behavior requires, such as available options or a
  server-loaded seating layout. Owner-known defaults, sibling configuration, and derived flow metadata
  stay with their owners, and an input reaches either the flow provider or each step, never both
  independently.
- A reusable step works when its route name or position changes. It may use navigation and lifecycle
  operations scoped to itself; it never knows a sibling's route name, assumes which step follows it, or
  requires an undocumented provider or wrapper outside its returned definition.
- Button and status copy describes the action the step performs, with neutral wording such as
  `Continue` when the next step is flow-defined; reusable content never names a presumed next step.
- StepFlow renders no progress bar, step tracker, or completed/remaining-step list. Its current
  heading, relative Back control, and optional transaction summary provide the workflow context, and a
  host flow does not reconstruct progress presentation.
- The flow's URL never names a step. Every visit enters at the first step, a refresh included, and
  step navigation never writes the browser URL or history. StepFlow's Back control moves to the
  preceding step; browser Back leaves the transaction, so no restorable checkout states accumulate. A
  visit never resumes where an earlier one stopped: when Next keeps a left route instance alive and
  shows it again, the flow returns to its first step.
- A return to the flow after leaving the page arrives at its URL like any visit. An emailed sign-in
  link carries its token there; the login controller brings its step forward, as far as the ledger
  allows, until the link has signed the visitor in.
- Every flow composes the login step and every other step for every visit. `createLoginStep()` reads
  the server auth state: a visit that starts signed in skips the step, and its controller brings it
  back if identity is lost during the visit, in this tab or another, then skips it again once the
  visitor signs in so the flow resumes where it was. A visit that starts signed out keeps it as an
  ordinary step, completed by signing in and continuing; if identity is lost later in that visit the
  step is not recalled automatically, but the steps that need an account require themselves and Back
  reaches the sign-in form. Signing in updates browser identity in place, with no server refresh, and
  the step then shows who is signed in with Continue and a way to switch accounts. Data a step needs
  from the account, such as its saved details, reaches the browser through a query keyed by user,
  hydrated from the server when the visit starts signed in.
- A terminal result step sets `final`. It is reached through `next()` like any step, which records the
  preceding step in the ledger; it omits Back and the running summary and reads the flow's values as
  any step does. Arriving there also records the result in the ledger, and the next visit that finds a
  result recorded clears the flow's stored values and starts at the first step, so no visit restores a
  finished transaction. A visit is a mount, an Activity reveal, or a new server render of the flow,
  which a link to the flow's own URL produces; a bfcache restore is none of these, so a result stays
  on screen through browser Back.
- A server step factory may return `null` when the step does not belong in the current flow. This is a
  composition decision made before StepFlow reaches the browser, not a completion rule. If refreshed server
  state omits the step the flow is on, the flow returns to the first retained step; if it only skips
  that step, the flow continues to the next retained configured step. StepFlow filters omitted
  factories before it evaluates navigation progress, so an omitted step never blocks a retained one.

## Flow ownership

- The flow owns ordering, its URL, and aggregate presentation such as a cross-step
  summary. Back means the preceding configured step, so the first step has no Back control. A
  cancel or exit action belongs explicitly to the flow that needs it. Route names are registry keys
  owned by the flow, never navigation values exposed to step implementations.
- Steps move relatively with `previous` and `next`. A controller that must return to its visible
  owning step uses its scoped activation operation. An exceptional named jump lives in the flow
  assembler, never in reusable step content, and needs a concrete workflow reason.
- A step summary may understand aggregate workflow state through scoped facts from `useStep()`, such
  as whether the first step is active; it never compares route-name strings.
  `useStep().isBeforeActiveStep` reports whether the calling step is retained and precedes the active
  step. It is false when that step is skipped or no step is active.
- State shared because summaries or later steps consume a validated result belongs to the
  closest workflow owner. Expose domain operations such as `chooseBlock`, `commitDetails`, or
  `resetOrder` when one action coordinates several changes, so no step has to know which downstream
  values a raw setter would invalidate.
- Calling `next()` records the active step as completed and advances to the following retained step.
  If a live prerequisite interrupts a later destination, `next()` preserves that destination without
  writing completion; the controller releases it by skipping the prerequisite again.
  StepFlow does not infer completion from current field values. A form calls `next()`
  from its successful submit path, a selection step enables its own action only when its value is valid,
  and a payment integration calls it from its successful completion callback.
- A step with a live prerequisite supplies `skipped` initially and updates it through its controller
  with `useStep().setSkipped(boolean)`. `true` skips its content in forward and Back navigation while
  retaining its controller; `false` requires the step even if the browser ledger records it completed.
  Omit `skipped` for ordinary steps governed by `next()`. Live prerequisite state is never persisted.
  If every step is skipped, controllers remain mounted with a loading notice until a step becomes
  available or the owning route redirects; `useFlowContext().activeStep` is then `undefined`.
- A requested configured route is reachable only when every preceding retained step is recorded as
  completed and no preceding live prerequisite requires attention. Otherwise StepFlow presents the first incomplete step. Previously
  reached steps remain revisitable. This browser ledger protects the intended navigation sequence, but
  browser state is mutable: authorization and authoritative transaction prerequisites remain server
  concerns and must be checked by the operation that needs them.
- Use a step `controller` only for behavior that must remain mounted while its content is hidden, such
  as retaining a seat hold or handling an authentication return. A controller is not the way to copy a
  stored slice into a flow context; the flow owner reads its slices directly. Login uses its controller to
  follow browser identity and to bring its step forward for an emailed link, while server checks still
  govern protected content and operations. Until the browser hydrates, StepFlow applies server-supplied live prerequisites
  with every stored slice absent; once hydrated it also applies the
  completion ledger. A form whose defaults come from a restored slice reads the
  slice itself, not a context value a controller fills in later, since a form keeps the defaults it
  mounted with.
- Keep step-only data and behavior out of a broad flow context. A flow owner holds a cross-step result,
  invariant, or transaction; shortening a prop list is not a reason.

## Header and actions

`StepFlow` has neutral default header and action renderers. Its region has a `step-flow` class, so a site
styles the semantic markup directly in its scoped CSS.

```css
body:has(.site-theme) {
  .step-flow {
    > header {
      h2 {
        font-size: clamp(2rem, 5vw, 4rem);
        text-transform: uppercase;
      }
    }

    .step-actions > .next {
      width: 18rem;
    }
  }
}
```

The default header uses `header` and `h2`, with `.summary`, `.heading`, and `.back` classes for the parts
that need direct targeting. The action container uses `.step-actions`, and the standard next control uses
`.next` so its treatment leaves secondary and replacement controls alone.

Supply `Header` or `Actions` only when the flow needs different markup or behavior, such as an action bar
that always renders both Previous and Next. Both are complete implementations: they receive semantic
props and own the markup and controls they render. A site can supply them to one flow or compose a site
`StepFlow` that provides them by default while individual flows override them. Kenstack imports no site
components and registers no global design. Export both from a `"use client"` module: `StepFlow` hands
them to its client renderer, and a Server Component reference cannot cross that boundary.

Steps render `StepActions` from `@kenstack/components/StepFlow/StepActions`. A step declares the action's
meaning, and `StepActions` forwards those props unchanged to the configured `Actions` implementation.
The default implementation builds the standard next control and `.step-actions` layout. A replacement
implementation owns the complete action area, including its control components, layout, and any Previous
or secondary actions. Because it is mounted inside the owning step, it can use `useStep()` without making
the step opt into or wire a site-level convention.

```tsx
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import { useStep } from "@kenstack/components/StepFlow/context";

// Continue to the next step.
<StepActions />

// Change only the label.
<StepActions next="Continue to payment" />

// Preserve step-owned commit logic.
const { next } = useStep();
<StepActions
  next={{
    disabled: selection.length === 0,
    label: "Next",
    onClick: () => {
      commitSelection(selection);
      next();
    },
  }}
/>

// Add a secondary action before the standard next action.
<StepActions>
  <button onClick={saveDraft} type="button">
    Save draft
  </button>
</StepActions>

// Replace or suppress the standard next action for an exceptional step.
<StepActions next={<SpecialPaymentControl />} />
<StepActions next={null} />
```

The default `Actions` implementation accepts `type`, `label`, `disabled`, `isPending`, and `onClick` in
the `next` option object. Its resolution is small:

- An explicit `type` wins.
- The current Kenstack `FormProvider` selects `submit` by default.
- Otherwise the action is a `button`.
- A default button calls the owning flow's `next()` operation.
- A submit action submits the form and never calls `next()` itself; the form advances only after its
  validation and success behavior allow it.

This keeps the ordinary form case declarative without a second form or button API in StepFlow:

```tsx
<Form
  onSubmit={({ data, mutation }) => mutation.mutate(data)}
  onSuccess={() => {
    commitResult();
    next();
  }}
  schema={schema}
>
  <Fields />
  <StepActions next="Continue" />
</Form>
```

Use a replacement React element when a payment control, wallet selector, or another exceptional action
does not fit the standard next-button contract; the option object stays small and never grows into a
parallel API for that component.

## State and persistence

- The flow owns its step, seeded from the first step the server composes; later steps live in memory
  and the URL is never rewritten. StepFlow stores only the sparse ledger of steps completed through
  `next()` so it can decide whether a requested step, such as a controller's recall, is reachable.
- React Hook Form owns live edits. Persist only validated, committed workflow results needed after a
  refresh or an authentication round trip.
- A flow has one store of named slices, keyed on its `basePath`, provided by
  `@kenstack/hooks/storedState`. The flow owns slice names. A value used by one step only lives in a
  slice named for that step's concept; a committed result that summaries or later steps consume lives
  in a slice the flow owner reads directly, so no step has to publish it upward. A reusable step never
  encodes a containing flow, sibling route, or position in a slice name.
- Give each distinct transaction a distinct `basePath`, including an event, showtime, booking, or other
  identity when it changes what a restored value belongs to. That path is the store id, so the same
  reusable step's slices stay in separate transaction pools.
- The flow owner reads and commits its slices with `useStoredValue(basePath, name, schema)` from
  `@kenstack/hooks/storedState`, for committed state that must survive a refresh or an authentication
  round trip. Persisted JSON is restored only when the schema accepts it. The hook returns
  `[value, setValue]`, keeps values for the flow's 24-hour lifetime, and clears a value when the
  setter receives `undefined`. A value is absent until the browser hydrates; `useIsHydrated()` tells
  that apart from nothing stored. A step that must own a slice nothing else reads takes the base path
  from `useFlowContext()`. Rotate a slice name only when a breaking stored-shape change requires it.
- StepFlow keeps its completion ledger and step-owned values in one storage scope with one shared
  24-hour lifetime. Every written value refreshes that lifetime, so the entire flow expires together
  24 hours after the latest change; removing a value leaves the lifetime alone. Past that deadline, stored values read as absent
  and the flow presents its first step. The first write after the deadline clears the flow's stored
  state before it is applied, so a tab left open past the lifetime starts a fresh flow: a later step
  returns to the first step, and the first step keeps its new value and continues. Stored values
  without a valid shared deadline read as absent and are cleared by the next write.
- Coordinate restoration before StepFlow presents the requested step. A finished transaction is never
  restored: the visit after a recorded result clears the store, and every visit enters at the first
  step.
- Browser storage is required for StepFlow's route-authorization ledger. When a stored-state mutation
  fails, the flow stops and asks the visitor to enable cookies and site data, then reload. It does not
  advance with an in-memory completion fallback.
- Authentication, account records, inventory, reservations, holds, completed bookings, payment
  authority, and query data remain with their server or library owner. A value already written to the
  database is never mirrored in browser storage. Browser storage may retain a recoverable selection or
  identity only until it receives a durable server owner, and it never becomes authoritative for those
  values.
- Derive payment presentation from complete domain results. A display-only amount or line item is not a
  substitute owner for the quantities, selections, or identifiers required to restore and submit the
  transaction.

## Review and cleanup

- Inspect every affected production flow, not only the changed step. Verify that factories return whole
  definitions, reusable content contains no sibling route names, and required providers or setup are
  not left at call sites.
- Inventory repeated step inputs, ambient context fields, cross-step setters, named navigation, and
  payment registrations. Keep each only when its owner and current consumer require that exact
  boundary.
- Contract tests protect relative navigation, requested-step reachability, scoped activation,
  controller behavior, and preservation of step-local state without pinning route names inside steps.

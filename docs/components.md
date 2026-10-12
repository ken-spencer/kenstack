# Components

Consult this reference when creating, changing, or consolidating a UI component in Kenstack or a host
site, and when adding or reviewing `role` or `aria-*` attributes. Shared form controls follow
`docs/forms.md`; host-site placement follows `docs/site-anatomy.md`; configuration surfaces and the
helper ladder follow `docs/code-organization.md`.

## Component reuse

- Before creating or retaining a component, search Kenstack and the host site's existing components for
  the control or workflow it implements. Use the existing owner when its current API supplies the
  required behavior, and extend it only when a current production consumer requires a variation; a
  different name or location does not make a parallel component a different owner.
- Inspect both component definitions and their production call sites. Repeated props, preprocessing,
  owner-known derived values, wrappers, or adjacent structure required to use the same component are
  duplicated ownership even with one component definition. Move intrinsic setup and sensible defaults
  into the component and keep only concrete consumer policy at the call site.
- Two components share an owner only when there is positive evidence of duplicate ownership: they
  perform the same domain job, expose equivalent contracts, or repeat distinctive behavior or
  substantial implementation. Compare control semantics, state transitions, submitted values,
  user-visible results, and substantial rendered structure. A shared native role, generic layout, or
  isolated difference is not evidence that components have the same owner. A local wrapper that only
  renames another component, forwards its props, or restates established markup or styling is a
  duplicate of that component.
- Differences between components neither prove duplication nor prove independent ownership. First
  establish duplication from their domain job, contract, provenance, or repeated implementation. Once
  that evidence exists, later drift in behavior, state handling, validation, errors, accessibility,
  props, copy, styling, dimensions, or markup does not by itself justify keeping both; preserve a
  difference only when a current product or design requirement intentionally requires it, and
  consolidate the rest through the canonical component.
- Keep separate components when they own different behavior. Superficial layout similarity earns no
  shared component, and neither does an extraction whose render callbacks, modes, and configuration
  would introduce more implementation than the duplication it removes.
- Use `ResponsiveRail` when side content belongs beside the primary content on wide screens and
  directly after it on phones, before the rest.

## Toggles

- In the admin and in forms, a button that is on or off uses `ToggleButton`, and a row of buttons
  choosing one of several uses `ToggleGroup`, both from `@kenstack/forms/controls/`; a form field
  uses `RadioButtonField`, which renders a `ToggleGroup`. Never hand-make a button with
  `aria-pressed` or a styled radio row for them. A checkbox or switch stays a checkbox or switch.
- A toggle's label never changes with its state; whether it is on shows only through its pressed
  state.
- A `ToggleGroup`'s options are all links or all choices. Links, each with an `href`, switch views,
  such as one theatre's calendar, and can render from a server component when they have no `icon`;
  choices switch state through `onValueChange`.
- Name a toolbar group with `label`. In a form field the fieldset's legend names the choice, so the
  group takes none.
- On is a solid fill in `--toggle-on` with `--toggle-on-foreground` text; a site sets both in its
  theme.

## Accessible control names

- A control's accessible name comes from native semantics, visible text, or an associated label. When
  visible text already names a control clearly enough for any user, that text is its name; an
  `aria-label` would replace it in the accessibility tree and can give screen-reader and voice-control
  users different or incorrect wording.
- Add `aria-label` only when the control needs a name and no native or visible source supplies a usable
  one, such as an icon-only button or a symbolic `+` / `−` control, and name the action the control
  performs. When the visible wording is unclear, improve it for everyone.
- Every `role` and `aria-*` attribute exposes necessary semantics, state, or relationships that native
  markup does not already provide. Remove one that only comments on the implementation, duplicates
  native semantics, names a role that does not support naming, or hides content already absent from
  the accessibility tree.
- Create a `region` landmark only when its content is important enough for independent landmark
  navigation, and name it with `aria-labelledby` when it has a visible heading; layout wrappers,
  loading skeletons, and focus targets are not landmarks.
- A pending area that shows anything shows a height-preserving skeleton of what it will hold, with its
  wording, such as "Signing you in", in a visually hidden status line; never a visible line such as
  "Loading…" or "Checking payment…". A pending button keeps its label and takes `Button`'s `isPending`,
  which shows its spinner; never swap the label for one such as "Saving…". Status wording goes in real
  text, never in an `aria-label` on a generic container.

## Visual language

These apply to every Kenstack site. Do not use:

- eyebrow, kicker, overline or tagline lines: a short line in smaller or muted type above or below a
  heading. Add one only when the user asks for it. Otherwise put the wording in the heading or the
  supporting copy, including a subtitle in supplied copy such as "Title: Subtitle"; when it fits
  neither, ask;
- italic accent words inside headings; the heading's wording carries the emphasis;
- numbered section labels such as `01` or `02`; the heading names the section;
- monospace labels; use the site's body or heading font;
- a label at one edge of a wide screen and its value, amount or time at the other; keep line items,
  totals, label–value lists and lists of items with amounts or times in a column of at most about
  45rem (about 60rem for a list with several columns), or in a main column beside a sidebar. Kenstack's
  shared admin module list is the exception: its status column stays at the right edge, so it sits in
  the same place in every module.

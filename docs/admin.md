# Admin Reference

Consult this reference for Kenstack admin modules, lists, edit forms, admin-specific validation
ownership, record saving, list configuration, relationship interfaces, and visual structure. Shared form
construction, controls, and state follow `docs/forms.md`.

## Access

Admins can open and do everything in the admin. Other roles reach a module only when it grants them,
by level: `viewers` view; `contributors` also edit; `editors` also delete. A module sets
its default grants; a site grants a module on its registry entry, and an entry that sets any level
replaces all of the module's defaults:

```ts
// a module's default
defineModule({ name: "tasks", contributors: staffRoles, … });

// a site's grant, in defineAdmin
{ module: users, contributors: staffRoles },
```

- Grants list roles and leave admin out. A module with no grant is admin-only. Only these levels can
  be granted; underneath, Kenstack checks three permissions: `view`, `edit` and `delete`.
- A person's permissions are the union of their roles' grants. A record-scoped child module
  (`parent`, an entry with a `foreignKey`) follows its parent's grants, and giving one its own
  grants throws; a navigation child is a module of its own.
- One access shape says who may do something, everywhere access is asked for (`pageRoute`,
  `requireUser`, pipeline stages, sidebar links and fields): `"authenticated"`, a role, a list of
  roles, or a module permission, `{ module: "users", permission: "view" }`. Admins pass every form,
  so a role list names only the other roles it lets in, and an empty list is admins alone.
  `await hasAccess(access)`, from `@kenstack/auth/server`, checks it for the signed-in person, such
  as whether a link to a user's record would open for them; it reads the user once per request and
  is false when signed out. In the browser, where the module registry isn't loaded,
  `hasRoleAccess(roles, access)` checks the role forms.
- Pages: a module's list and record need `view`, and `/new` and a singleton with no row yet need
  `edit`. A signed-in person without it sees the "No access" page; the reserved pages
  (email log, style guide) are for admins.
- The admin API takes the permission each action needs: `view` for list, neighbours, revisions, a
  one-to-one load and a relationship field's label lookup; `edit` to save, reorder, upload, search
  tags and search a relationship; `delete` to trash, restore or delete. Impersonation, the email
  log, the page editor, draft mode and module settings stay admin-only whatever module is named. A
  signed-out caller is refused first; each action then checks its own access. An unknown action or
  module, or one without admin records, answers a 404 that names it.
- The editor and list hide what the person can't do: New, Save and reorder handles without `edit`,
  and trash, restore and delete without `delete`.
- The sidebar shows a module with `view`. A plain link (`{ href, title }`) is admin-only unless its
  `access` says who else sees it, such as `"finance"`; its page checks access itself.
- A field's `access` says who gets it in the editor; admins always do, and without it everyone who
  opens the module does. The editor hides the field from everyone else, and shows it read-only to
  someone it names who can't save the record. Someone who can't save the record gets every field
  read-only and no Save. A custom field component is locked only through Kenstack's form controls:
  don't set `access` on a field whose component writes with `setValue`, `useController` or
  `useFieldArray`, or has buttons of its own. A save never writes a field the person can't change:
  their schema leaves it out, so parsing drops any value sent for it. An existing record keeps its
  value, and a new record takes the column's default, which the field's own default must match,
  since that is what the editor shows. The editor, its saves and its revisions never send a hidden
  field's value to the browser, and the editor and its save never check the field. A new record's form
  starts from the module's static `defaultValues`, hidden fields' included; neither the form's schema
  nor the save's sends or keeps them. Lists,
  filters and search don't filter these fields yet; build that before a restricted field holds
  something a granted role mustn't read. Kenstack's users module gives its Roles field
  `access: "admin"`. On an existing contact, only admins change the sign-in email. One-to-one
  relation fields can't set `access` yet: defining one that does throws.
- A module with its own pipeline stages or pages checks their `access` itself; a grant doesn't reach
  a stage that says `access: "admin"`. A stage can instead name a permission in a module,
  `access: { module: "tasks", permission: "edit" }`: it refuses as a role list does, and its
  action's `user` is the signed-in person.

## Style guide

`createAdminPage()` owns `/admin/style-guide`, with `?context=base`, `admin`, or `site` selecting the
theme. `style-guide` is a reserved admin route name; modules cannot use it. The page requires an
administrator and returns not found outside development or with additional path segments.

`/admin/style-guide` frames `/style-guide/<context>`, which `@kenstack/admin/style-guide/ContextPage`
provides. That page requires an administrator in development, returns not found outside development
or for a context other than `base`, `admin`, or `site`, loads Kenstack's admin and style-guide themes,
and sets noindex metadata.

The style guide is optional. A site opts in with a stub route that re-exports the page and its
metadata, then imports the site theme so it loads after Kenstack's:

```tsx
// app/style-guide/[context]/page.tsx
export { default, metadata } from "@kenstack/admin/style-guide/ContextPage";

import "@/components/SiteShell/theme.css"; // the site's own theme
```

A site without the stub adds nothing; `/admin/style-guide` then shows a 404 inside its frame.

## Email Log

`createAdminPage()` owns `/admin/email-log`, a read-only list of every email `@kenstack/lib/mailer`
sent except error reports, and `/admin/email-log/<id>` for one message. `email-log` is a reserved
admin route name. The site registers `@kenstack/db/tables/emailMessages` in its schema and links the
page from its sidebar, in a "Logs" group. Each `mailer()` call names its `kind` and, when the email is about a record, its
Drizzle `table` and `rowId`; a message links to that record when a list module edits its table.

A `mailer()` call passes `notification: true` for mail its recipients don't expect: broadcasts and
automatic notices, such as staff alerts and task or comment notices. Outside production
(`VERCEL_ENV` other than `production`, so development, `next start` and previews), a notification
goes only to the developer: the addresses in `DEVELOPER_EMAIL`, comma-separated. The message is
unchanged, but SES delivers it only to those of its recipients (to, cc or bcc). One with none of
them is not sent; the Email Log shows it as Skipped with the reason "Withheld outside production",
and the caller gets `{ status: "sent" }` with no message id. Without `DEVELOPER_EMAIL`, no
notification is sent outside production. Mail the recipient caused, such as a sign-in code, a
receipt or a confirmation, and mail someone sends to a chosen person on purpose, such as an
invitation, is not marked and always goes out, so testers on a preview receive it.

## One-to-Many Relationships

Before implementing a new one-to-many admin relationship, decide whether staff should manage it as a
Child Module or an embedded custom field from how they work with it, not from relational storage,
foreign keys, or generic CRUD support.

- Use an embedded field when descendants are normally created, reviewed, and changed with the parent.
  The rows may remain relational; Event Dates & Times and Ticket Pricing are established patterns.
- Use a Child Module when children need an independent list, search, bulk operations, permissions,
  navigation, large-scale management, or a lifecycle that would make the parent editor misleading.
- Direct operational lookup, including barcode lookup, does not by itself require a Child Module.
- Confirm the save boundary, permissions, audit and revision behavior, deletion, expected scale, and
  navigation for either choice.

## Visual Structure

- Inside an existing section border, use spacing, headings, dividers, or a subtle background; a nested
  bordered panel is for a distinct repeated record.
- Use `border-[var(--admin-divider)]`, or its side-specific equivalent, for structural admin borders,
  and the generic border color for fields and controls.

## Edit Page Route

A record's editor answers at `/admin/<name>/<id>` and also at `/admin/<name>/<id>/edit`. A module
whose record page is a read-only view the host mounts at `/admin/<name>/[id]` links its Edit button
to `/edit`.

## Custom Editors

A module whose editor needs more than its generated form passes `Edit` to `defineAdminClient` beside
or in place of `EditForm`. `Edit` renders `AdminEdit` from `@kenstack/admin/Edit/AdminEdit`, which
owns the form, saving, conflicts, the unsaved-changes guard, the breadcrumbs and the child-module
links:

```tsx
<AdminEdit
  toolbar={
    <EditToolbar end={<DeleteButton />}>
      <ViewButton />
      <SaveButton />
    </EditToolbar>
  }
  footer={
    <EditFooter>
      <RecordDates />
    </EditFooter>
  }
>
  <Fields />
</AdminEdit>
```

- Each slot takes an element. An omitted slot keeps Kenstack's default: the standard toolbar, the
  footer with the record's dates and Previous/Next, and the module's `EditForm` as the fields (its
  relation tabs for a one-to-one module). An `Edit` given without `EditForm` must pass its fields.
- `EditToolbar` (`Edit/Header/EditToolbar`) leads with its children and ends with `end`. Compose it
  from `ViewButton`, `SaveButton` and `DeleteButton` in `Edit/Header/`; `ViewButton` links to
  the record's own page at `/admin/<name>/<id>`. `EditFooter` and `RecordDates` are in `Edit/`.
- The fields read the record from `useAdminEdit()` (`@kenstack/admin/Edit/context`).
- A module's own list keys its queries under `getAdminListQueryPrefix(name)` from
  `@kenstack/admin/List/queryKey`, so the editor's saves and deletes refresh it.

## Edit Form Layout

- Follow the established two-column admin edit rhythm: primary identity fields first (`name`, `title`,
  `slug`, `code`); right-column operational and meta fields next on mobile (visibility, publish date,
  module-specific selectors); long content fields (description, body, details) after those controls.
- Preserve that mobile order while keeping the desktop layout independent of it.
- Keep the primary and right columns as independent layout regions, so the desktop description or
  content area sits directly under the primary identity fields while the right column stays beside
  them; a shared grid that makes later left-column fields wait for the full sidebar height breaks this.
- Keep right-column fields narrow and operational; long text, rich content, and large repeated controls
  belong in the primary column.
- When independent fields share a grid or flex row, align the row's children to the start with
  `items-start` at the same responsive breakpoint, because labels, descriptions, help text, and
  validation messages can make one field taller. Use another alignment only when it stays intentional
  and stable as those elements appear.

## Validation Ownership

- Keep validation messages as short sentence-case fragments without trailing periods, such as
  `Enter a valid date like June 25, 2026`.
- The field schema owns field-value validation. Before adding `preSave` validation, trace the submitted
  value through the form and schema and state why those boundaries cannot enforce the requirement.
  `preSave` is for correctness that depends on current server state, where accepting a stale submission
  has a meaningful consequence; a hypothetical race or an extra layer of checking is not that.
- Use the shared `Field` and `FormControl` components for a custom control that represents one
  registered field; they own the field message and accessible `aria-invalid` / `aria-describedby`
  wiring. When a composite or repeated control must use React Hook Form controllers directly because
  one field wrapper cannot represent its nested error paths, render each relevant error with the shared
  `FieldErrorMessage` beside the affected control and wire that control's invalid and described-by
  state to the message. A custom control bypassing the standard field wrapper is not evidence that
  schema validation is missing.
- Use `Combobox` for the standard searchable options interaction, `ComboboxRoot` with the named
  combobox parts for custom composition, and `ComboboxField` when the standard control connects
  directly to React Hook Form. Domain fields compose the lowest suitable shared control and keep its
  keyboard, filtering, selection, and clear behavior.

## Generated Fields

- Module form-component generation, module clients, settings forms, and import direction follow
  `docs/module-anatomy.md`; reusable field and component boundaries follow
  `docs/kenstack-anatomy.md#field-library`.
- `defineTable({ publish, seo })` owns the publication and SEO fields. `defineModule(...)` and the admin
  edit context add `visibility`, `publishedAt`, `seoTitle`, `seoDescription`, and `ogImage` from the
  table (a module field sharing one of those names is rejected at definition), the edit header's Save
  control shows the status its next save commits and its menu stages another, the header renders
  the Search & sharing dialog, and module edit forms render none of them. A module whose records carry a different concept, such as
  sales availability, declares its own field under its own name instead of reusing these.
- Put invariant control configuration on the field definition. Kind-specific options such as combobox
  choices and empty-state copy, or number bounds and step size, travel with the field and are not
  render-site overrides. Explicit labels and descriptions are field-owned too; generated controls
  derive a label from the field name only when none is configured. Render props carry local
  presentation such as layout classes, contextual help, and interaction state.
- Field-specific server behavior registered through `admin.serverFields` needs no matching custom
  component. Keep the field's built-in editor unless editing that field's own value requires a
  different control.
- Configure `imageField({ selectVariant: "original" })` when record loads need the original image in
  place of the default square selection, and a file field's empty-state instruction with
  `placeholder`; the built-in editor owns its standard replacement instruction. Neither variation needs
  a new field kind or component.
- A component registered for a field property represents that field and consumes its supplied `name`.
  A custom component is warranted when the field's own value requires a specialized control. Compound
  editors may read or update sibling values, but their owned value cannot be bound to an embedded
  property path.
- One-to-one edit forms receive the bare relation `fields` and their `prefix` through the client
  configuration. Resolve and generate ordinary relation controls inside the relation form, where their
  components are owned; when a bespoke panel renders only a subset, generate that subset and pass the
  same prefix or full field names into its custom controls.
- A one-to-one kind's server and client entries, their registration by canonical key in
  `admin.oneToOne` and the admin client's `oneToOne`, and which fields stay in the parent `EditForm`
  follow `docs/module-anatomy.md#one-to-one-kind-units`. The registration key is the persisted
  discriminator, and the first registered relation is the default. The host table declares the
  persisted `kind` column; `defineModule(...)` adds the reserved field to the resolved map, schema,
  defaults, list, and filters, so it is never declared or rendered as an ordinary parent field.
- Use `relationshipField({ mode: "single" })` for a scalar foreign-key selector. The field name
  identifies a directly persisted table column with exactly one single-column foreign key to the `id`
  of exactly one registered admin-list module; Kenstack derives the searchable options, labels, and
  order from that target module. The default mode remains `"multiple"`, and many-to-many fields
  continue to pair the isomorphic definition with `relationshipField(relationship)` from
  `@kenstack/fields/server`.

## Caching Module Content

Reading module content on the site:

- A list: call `listQuery` in a cached function and pass `cacheTags`: the module's name plus each
  joined dependency. See [Cached lists](module-anatomy.md#cached-lists).
- A page: call `pageQuery` with the module's record tags, such as `["news", "news:" + slug]`. See
  [Cached detail pages](module-anatomy.md#cached-detail-pages).
- One record by id: tag it with `adminLoadCacheTag(module.name, id)` from `@kenstack/admin/cache`.
  This shares the tag, not the admin query's payload or cache entry: select the public fields and keep
  authentication outside the cache.

Clearing it when the content changes:

- The module's own admin saves and removals expire its record and list tags, its name tag and its
  `admin.revalidate` tags. A reorder expires only the list and name tags and the fixed-string
  `admin.revalidate` tags. `admin.revalidate` lists only the other tags a change affects; declare each
  once there.
- Any other code that changes what a cached read or an admin list shows, such as another module, a
  package or a site action, expires the tag itself after its commit:
  `revalidateTag(tag, { expire: 0 })`, with `adminListCacheTag(name)` for an admin list. The email
  change does this for users in `src/auth/email/change/api.tsx`.
- An admin list takes no dependency option; the code that changes its data clears it.

## Record Saving

- Use `saveModuleRecord({ module, id, changes, values })` for authenticated site actions that update
  records also managed in admin, such as a public profile or account-details form. Import it from
  `@kenstack/admin/queries/save`. Authenticate and authorize the target record in the action; for a
  self-service form, derive `id` from the authenticated user, never the submitted payload. It writes
  the columns named in `values` and runs the handlers of the module fields among them, so the action's
  Zod schema, which strips undeclared fields, is the allowlist: a member-facing schema lists only what
  members may change. Return only permitted saved values, not the full admin record. A member's own
  account uses `updateUser` from `@kenstack/auth/server`, and a proven visitor's new account
  `createAccount`; both save through this path, `createAccount` acting as the new account.
- A proven visitor's provisional state lives in the `verifications` table. Their users row is created
  only when the details save succeeds, in one transaction with those details. A provisional sign-in
  never creates one.
- `saveModuleRecord` and `saveAdminRecord` share the module's persistence and `admin.revalidate`
  rules. Their record and list tags expire after commit, before follow-up tasks and audit logging.
  Declare additional content dependencies once in `admin.revalidate`; public forms do not duplicate
  that tag list. Session snapshots also carry the users record tag, so module saves and removals need
  no site-level session-invalidation callback.
- A module whose records carry their own work on every save, such as a timeline entry or a notice,
  declares `admin.afterSave`. Both save paths run it inside the save's transaction after the fields
  save, after Kenstack's own hooks, with the saved `row`, the `values`, `changes` and `isNew`; a
  failure rolls the save back. Email and other work that must wait for the commit is returned as
  `afterCommit`. A field hook runs only when its field changed; `afterSave` runs for every save that
  writes the record, but not for one with nothing to record, a trash, a restore or a reorder. A site
  form's `row` holds only the columns it saved; the hook reads others through `tx`.
- `loadRecord` does not cache reads; to cache one, see
  [Caching Module Content](#caching-module-content).
- Use `saveAdminRecord({ module, id, changes, values, updatedAt })` for the standard admin module
  save path after the pipeline has enforced the module's access. It supplies admin-save authority to
  field handlers and never infers authority from the user's roles.
- Use `saveRecord(...)` directly for custom persistence no module represents, such as settings or
  page-editor saves. It is restricted by default; set `admin: true` only in a backend admin action,
  never from request data or user roles.
- A record's `updatedAt` is its concurrency token. An editor loads the record's id and `updatedAt`,
  sends both with each save, and adopts the `updatedAt` the save returns. When the record changed
  since, changes to other fields merge and a change to the same field refuses with the
  `record-changed` code; a site form and the page editor pass no token and do not compare. The table
  builders set the token on every write, so no write sets `updatedAt` itself. A write that moves it
  without a revision, such as a restore, refuses every stale editor; one that must not, such as a
  reorder, keeps `updatedAt: table.updatedAt`.
- Keep direct writes when the module save cannot express a required transaction, unauthenticated
  submission, or conflict-handling contract. They bypass module revalidation: expire the affected
  module, record, and list dependencies explicitly after commit, before follow-up work. Do not split
  an atomic operation just to use the module save helper.

## List Config

- In admin lists, render record-title links with `ListTitle` from `@kenstack/admin/components/ListTitle`,
  which sizes the link to its visible text so no invisible click target stretches across empty flex
  or grid space.
  When the whole row should navigate, implement an explicit accessible row interaction.
- Configure list behavior on field definitions with field options such as `list`, `filter`, and `sort`.
  Module-level `admin.list.sort`, `admin.list.filters`, and similar explicit list maps are escape
  hatches for custom behavior field options cannot express, and never repeat a field-level
  `sort: true`.
- List rows carry only `id`, timestamps, `visibility` when the table publishes, fields flagged `list`,
  and `admin.list.select` columns; the
  edit load carries only defined fields plus `admin.select` columns. When a custom list item or edit UI
  displays data no editable field owns, such as submitted inquiry columns, add those columns to the
  matching select in place of placeholder fields.
- Use `admin.list.reorder` when the module has an explicit ordering field; it is separate from ordinary
  sortable field configuration. `defineTable({ reorder: true })` provisions the standard `sortOrder`
  column and index only. `admin.list.reorder: true` uses one active-record sequence for the table, while
  `admin.list.reorder.scope` gives each required foreign-key value its own sequence. Module saves assign
  positions through that configured list behavior; direct database writes only receive the column
  default.
- On a top-level module, a scoped reorder automatically selects its scope field and related record
  title for the list and keeps groups contiguous. For a scope such as `categoryId`, the title is
  available as `category`; an explicit list selection with that name overrides the default. The
  required single-column foreign key identifies the related admin module, whose record title, route,
  and default list order supply the group heading. The scope references the related module's `id` and
  is a directly saved module field. A child module's list is already scoped by its parent, so it takes
  no `reorder.scope`. Add a scope-plus-order composite index in the host table when the expected list
  size warrants it.
- The admin list reorder interface owns reorder values such as `sortOrder`: keep the database column,
  enable `admin.list.reorder`, and leave the field out of module `fields.ts` definitions and admin edit
  forms.

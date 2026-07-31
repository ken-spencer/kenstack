# Kenstack Migrations

Use this file to document breaking Kenstack API changes that downstream sites may need to apply.

Migration notes describe the current implemented API; they do not define it. During review, verify each note against the implementation and current public contract. If a note has drifted, correct the note—do not rename, reshape, or otherwise change the current API merely to make it match migration documentation. Change the API only when the implementation requirements independently call for that change, then update the migration note to describe the result.

Before renaming a committed shared or exported type, inspect every consumer and require the old name to be
materially misleading about the public contract. Compile Kenstack and a representative host, and document
the downstream migration when the rename proceeds.

## Unreleased: Operational Error Reporting

Old API:

- `@kenstack/lib/errorLog` accepted an `Error`, optional message, and optional context data through a default export.

New API:

- `@kenstack/lib/errorLog` remains available for curated request and event
  logging. It accepts `{ name, message?, context?, error? }`, adds sanitized
  request and location context, and writes the event to the server error log.
  This API is appropriate for expected operational events such as a rate-limit
  rejection; it is not the unexpected-error reporting path.
- Unexpected errors are reported through `deps.error(errorOrMessage, { context?, request?, source? })` when application dependencies are available. Strings are converted to `Error` internally with a caller stack; existing `Error` objects retain their original stack and cause.
- Framework hooks and reporter-owned adapters may use `reportError(...)` from `@kenstack/lib/errorReporter` directly.

Migration steps:

- For a curated event that should remain in the server log, replace the old
  positional call with `await errorLog({ name, message, context, error })`.
  Choose a stable event name and keep structured context non-sensitive.
- Replace `errorLog(error, message, data)` with `await deps.error(errorOrMessage, { context, request })`. Put details needed to understand the failure in the message. Keep `context` only for selected, non-sensitive structured values that are useful for filtering or correlation; do not repeat the message or pass the old `data` object through wholesale. Add `source` only when it distinguishes information that is not already clear from the message, stack, and request path.
- Pass the current `Request` when one is available so the reporter can include sanitized request metadata.

## Unreleased: Shared Rate-Limit Storage

Old API:

- `createDeps(...)` did not require shared database storage for rate-limit
  events.

New API:

- The tables passed to `createDeps(...)` include `rateLimitEvents` from
  `@kenstack/db/tables/rateLimits`.

Migration steps:

- Export `rateLimitEvents` with the host application's table registry.
- Generate and commit an append-only host migration that creates the
  `rate_limit_events` table and its declared indexes. Do not copy another
  host's generated migration or rewrite existing migration history.

## Unreleased: reCAPTCHA Availability

`recaptcha(...)` no longer returns a pipeline stage. Call it directly from the protected action after schema
parsing and cheaper application-owned guards, but before the protected side effect:

```ts
const recaptchaRejection = await recaptcha({
  action: "form_action",
  request,
  response,
  token: data.recaptchaToken,
});
if (recaptchaRejection) {
  return recaptchaRejection;
}
```

Include the token in the protected action's pipeline schema so malformed values become missing tokens instead
of form-field errors:

```ts
recaptchaToken: z.string().optional().catch(undefined),
```

Missing or invalid tokens, expired checks, low scores, wrong actions, and other documented assessment rejections
still stop the request. Availability failures fail open. Operator-actionable failures, including incomplete
configuration, transport failures, unusable responses, and over-quota assessments, are reported through
`deps.error(...)`. `browser-error` also fails open but is not reported.

## Unreleased: Square Crop Value

Old API:

- `SquareCrop` included `mode: "center" | "manual"` and made `zoom` optional.

New API:

- `SquareCrop` is the manual crop coordinates `{ x, y, zoom }`.
- `null` represents the centered crop. An omitted `squareCrop` property means the crop was not submitted for change.

Migration steps:

- Replace centered crop objects with `null`.
- Remove `mode: "manual"` from manual crop objects and supply `zoom`; use `1` when an older value omitted it.
- If persisted media JSON contains crop objects, normalize those values before relying on the new type. No database column migration is required.

## Unreleased: Module Record Save Helpers

Old APIs:

- `saveAdminRecord({ moduleConfig, actionPrefix?, fields?, id, changes, values })` was used by both admin actions and site-owned profile actions.
- Site actions configured restricted media behavior separately on each server field.
- `saveRecord(...)` did not tell field handlers whether the save came from an admin action.

New APIs:

- `saveModuleRecord({ module, fields, id, changes, values })` saves a module record from an authenticated site action with restricted field authority and module-owned cache revalidation. The explicit field set defines that action's writable and returned surface; it must not be replaced with the module's broader admin fields.
- `saveAdminRecord({ module, id, changes, values })` saves through the standard admin path and supplies admin-save authority to field handlers.
- `saveRecord(...)` remains the low-level helper for custom persistence. It is restricted by default and accepts `admin: true` for backend actions that have already enforced admin access.
- Admin-save authority describes the backend action, not the current user's roles, and is never accepted from submitted data.

Migration steps:

- Rename the `saveAdminRecord` `moduleConfig` property to `module` and remove `actionPrefix` and `fields`; both are now derived by the admin save path.
- Replace non-admin `saveAdminRecord(...)` calls with `saveModuleRecord(...)`.
- Remove site-level server-field options that suppress admin metadata or media selection behavior. The save helper now supplies that context to field handlers.
- Add `admin: true` to direct `saveRecord(...)` calls owned by backend admin actions, such as custom settings or page-editor persistence. Leave ordinary authenticated actions on the restricted default.

## Unreleased: Admin Document Metadata

Old behavior:

- Catch-all admin pages exported only `createAdminPage()` and inherited the site's generic document title.

New behavior:

- Kenstack exports `generateMetadata()` from `@kenstack/admin/AdminPage`.
- The function parses the catch-all route, resolves the configured module title, and returns an absolute title such as `People · Admin` without loading the record.

Migration steps:

- Re-export the shared function as Next.js `generateMetadata` from the site's catch-all admin page. Next.js discovers metadata from route files, so `createAdminPage()` cannot install this named export itself.

  ```ts
  import { createAdminPage } from "@kenstack/admin/AdminPage";

  export { generateMetadata } from "@kenstack/admin/AdminPage";

  export default createAdminPage();
  ```

## Unreleased: Admin Theme Stylesheet

Old behavior:

- Sites supplied admin color tokens through their public global stylesheet.
- Admin styling could therefore inherit site-specific palette changes unintentionally.

New behavior:

- Kenstack provides complete light and dark admin palettes in `@kenstack/admin/theme.css`.
- The stylesheet is scoped to `body:has([data-admin-theme="light"])` and `body:has([data-admin-theme="dark"])`, including body-mounted admin portals without affecting public routes.

Migration steps:

- Import the stylesheet directly from the site admin layout:

  ```ts
  import "@kenstack/admin/theme.css";
  ```

- Keep `data-admin-theme="dark"` or `data-admin-theme="light"` on the admin layout wrapper.
- Remove copied admin palette declarations from the site's public global stylesheet. The host application still owns its Tailwind dark-variant strategy and public-site palette.

## Unreleased: Flat Server Field Behavior

Old APIs:

- `serverFields(...)` entries were resolver callbacks that received the client field and returned server behavior inside `{ behavior: { ... } }`.
- Resolved server fields exposed lifecycle and query behavior through `field.behavior`, such as `field.behavior.save` and `field.behavior.select`.
- Server filter configuration was stored at `field.behavior.filter`, alongside the client field's `filter: boolean` option.
- Custom resolver helpers used the `ServerFieldDefaults` return type.

New APIs:

- `serverFields(...)` entries are direct `ServerField` contributions with `load`, `save`, `preSave`, `delete`, `select`, `listSelect`, `upload`, and other server properties at the top level.
- Resolved server fields expose those properties directly, such as `field.save` and `field.select`.
- The client `filter: boolean` option remains unchanged. Resolved server filter configuration is now `filterConfig` so the flat property names remain distinct.
- Custom resolver helpers do not need a patch-specific return type.

Migration steps:

- Remove the `behavior` object from every `serverFields(...)` resolver:

  ```ts
  // Before
  serverFields(fields, {
    title: () => ({
      behavior: {
        preSave: validateTitle,
        select: selectTitle,
      },
    }),
  });

  // After
  serverFields(fields, {
    title: {
      preSave: validateTitle,
      select: selectTitle,
    },
  });
  ```

- Remove `ServerFieldDefaults` return annotations from custom server-field helpers. Let TypeScript infer the return type, use `ServerField` for a direct field contribution, or use `ServerFieldResolver` for a helper that derives behavior from the client field.
- Replace resolved-field reads such as `field.behavior?.load`, `field.behavior?.save`, and `field.behavior?.select` with `field.load`, `field.save`, and `field.select`.
- Replace custom server filter patches and reads from `behavior.filter` with `filterConfig`. Do not rename the client field option `filter: true`.

## Unreleased: Admin Table and Field Capabilities

Old APIs:

- `defineTable(...)` always added `publicId`.
- Reorderable admin tables manually added a `sortOrder` column to `columns`.
- Reorderable admin lists used `list.reorder = { field: "sortOrder" }` for the standard reorder column.
- Publishable tables manually added `metaColumns.visibility` and `metaColumns.publishedAt` to `columns`.
- SEO tables manually added `metaColumns.seoTitle`, `metaColumns.seoDescription`, and `metaColumns.ogImage` to `columns`.
- Publishable admin field maps used `defineFields({ ..., visibility: metaFieldOptions.visibility, publishedAt: metaFieldOptions.publishedAt })`.
- SEO admin field maps used `defineFields({ ..., seoTitle: metaFieldOptions.seoTitle, seoDescription: metaFieldOptions.seoDescription, ogImage: metaFieldOptions.ogImage })`.
- Plain field maps imported `defineFields` from `@kenstack/fields/defineFields`.
- An intermediate admin field-map API used `defineAdminFields` from `@kenstack/admin/fields`.
- `AdminTable` implied a `publicId` column.

New APIs:

- `defineTable(...)` accepts `publicId`, `reorder`, `publish`, and `seo` options.
- `publicId: true` adds the generated `publicId` column. Omit `publicId` for tables that do not need opaque public IDs.
- `reorder: true` adds the standard `sortOrder` column and active-record index.
- `list.reorder: true` uses the standard `sortOrder` field. Use `{ field, label }` only for custom reorder columns or labels.
- `publish: true` adds the standard `visibility` and `publishedAt` columns plus a `(visibility, publishedAt)` index where `deletedAt IS NULL`. This matches the standard `listWhere()` equality/range predicate; do not replace it with a `publishedAt`-only index.
- `seo: true` adds the standard `seoTitle`, `seoDescription`, and `ogImage` columns.
- Isomorphic `defineFields(...)` from `@kenstack/admin/fields` is the single field-map authoring API.
- `defineFields({ fields: { ... } })` defines plain field maps.
- `defineFields({ publish: true, fields: { ... } })` adds the standard `visibility` and `publishedAt` field definitions.
- `defineFields({ seo: true, fields: { ... } })` adds the standard `seoTitle`, `seoDescription`, and `ogImage` field definitions.
- `AdminTable` represents the base defined-table contract. Use `AdminPublicIdTable`, `AdminPublishTable`, or `AdminSeoTable` when code requires those generated columns.

Migration steps:

- For admin modules with `admin.list.reorder.field = "sortOrder"`, remove the manual `sortOrder` column from `columns` and set `reorder: true` on `defineTable(...)`.
- Remove manual active-record `sortOrder` indexes after setting `reorder: true`.
- Replace standard `list.reorder = { field: "sortOrder" }` with `list.reorder = true`.
- For admin modules with standard publishing fields, remove manual `visibility: metaColumns.visibility` and `publishedAt: metaColumns.publishedAt` columns and set `publish: true` on `defineTable(...)`.
- Replace manual active-record `publishedAt` indexes with the composite index generated by `publish: true`.
- For admin modules with standard SEO fields, remove manual `seoTitle`, `seoDescription`, and `ogImage` meta columns and set `seo: true` on `defineTable(...)`.
- Replace field-map imports from `@kenstack/fields/defineFields` with `@kenstack/admin/fields`.
- Replace `defineAdminFields(...)` with `defineFields(...)` from `@kenstack/admin/fields`.
- Wrap plain field maps in the new object shape, changing `defineFields({ title: textField() })` to `defineFields({ fields: { title: textField() } })`.
- For admin field maps with standard publishing fields, use `defineFields({ publish: true, fields: { ... } })` and remove the manual `metaFieldOptions` entries.
- For admin field maps with standard SEO fields, use `defineFields({ seo: true, fields: { ... } })` and remove the manual `metaFieldOptions` entries.
- For tables that relied on the old implicit `publicId` column, add `publicId: true` to `defineTable(...)` before upgrading.
- Remove `publicId: false` from tables that only used it to opt out of the old default.
- For table types or helpers that require `table.publicId`, use `AdminPublicIdTable`.

## Unreleased: Admin Server/Client Module Split

Old APIs:

- Site modules imported `defineModule` from `@kenstack/admin`.
- `defineModule(...)` accepted a `client` config directly.
- Server module files imported client config files, form components, list renderers, and field components through the module config.
- Admin pages could call `createAdminPage()` without passing client loaders.
- Module settings controls could import the module config and pass it to a shared control component.
- Custom field components could be passed as already-imported React components on field definitions.

New APIs:

- Server module definitions import `defineModule` from `@kenstack/admin/server`.
- Server admin registries import `defineAdmin` from `@kenstack/admin/server`.
- `defineModule(...)` is server-only and no longer accepts `client`.
- Client admin config stays in each module's `client.ts` and is loaded separately through a site-owned client loader map.
- Client admin config files import `defineClient` from `@kenstack/admin/client`.
- Site admin pages call `createAdminPage()` after `defineAdmin(...)` attaches client loaders to the module registry.
- Client loader maps use `defineAdminClients(...)` from `@kenstack/admin/clientLoaders`, with a map of dynamic imports.
- Sites pass the resolved module registry to `createDeps({ modules })`; admin pages, API routes, and the sidebar read it from `deps.modules`.
- Admin edit screens load records on the server through `loadAdminEdit` instead of posting `{ action: "load" }` from the client.
- Module settings client config uses `defineSettingsClient(...)` from `@kenstack/admin/client`.
- Server field metadata imports should use explicit server-safe paths such as `@kenstack/admin/metaFields` instead of importing mixed admin APIs from the main admin barrel.
- Public routes that expose admin-only settings controls should pass the enriched registry module to `ModuleSettingsControl`; the control reads `module.client` internally.
- Custom field components use loader functions, for example `component: () => import("./components/MyField")`, instead of direct component imports.
- The main `@kenstack/admin` barrel is for shared admin types, list metadata types, search-param helpers, and meta field constants. Do not use it for server-only builders or client config builders.

Migration steps:

- Before moving `defineModule(...)` from `admin.ts` or `server.ts` into a module `index.ts`, check whether that index currently exports shared components, browser-safe data, or types used by Client Components. Do not combine those boundaries; retain a separate server entry point or migrate every client consumer to explicit client-safe subpaths.
- Change server module imports from `@kenstack/admin` to `@kenstack/admin/server`.
- Change server admin registry imports from `@kenstack/admin` to `@kenstack/admin/server`.
- Change client config imports from `@kenstack/admin` to `@kenstack/admin/client`.
- Change metadata field imports from `@kenstack/admin` to `@kenstack/admin/metaFields` when the file only needs `metaFieldOptions`, `visibilityOptions`, or `visibilityValues`.
- Keep query helpers such as `listWhere`, `pageWhere`, and `createMetadataLoader` on `@kenstack/admin/queries`, not the main admin barrel.
- Keep page editor imports on the page editor subpaths, for example `@kenstack/admin/pageEditor`, `@kenstack/admin/pageEditor/loadContent`, `@kenstack/admin/pageEditor/TextEdit`, and `@kenstack/admin/pageEditor/MarkdownEdit`.
- Remove `client` from every `defineModule(...)` call. Keep only server-safe admin config, settings table config, fields, handlers, cache tags, and route metadata in the server module file.
- Keep each module's admin UI config in `client.ts`, exported as `client = defineClient(...)`.
- Add a Client Component loader map in the site, for example:

  ```ts
  "use client";

  import { defineAdminClients } from "@kenstack/admin/clientLoaders";

  export const clients = defineAdminClients({
    news: () => import("./news/client"),
    users: () => import("./users/client"),
  });
  ```

- Pass that loader map to the site module registry so each module entry gets a `client` loader:

  ```ts
  import { clients } from "./clients";

  export const modules = defineAdmin([news, users], clients);
  ```

- Pass `modules` to `createDeps({ modules })`.
- Replace `createAdminPage({ adminConfig })` with `createAdminPage()` and `adminPipeline({ adminConfig })` with `adminPipeline()`.
- Remove the `admin` prop from `Sidebar`.
- Remove client queries that post `{ action: "load" }`; let `<Edit />` load server edit data and use `adminLoadCacheTag(...)` when save or remove actions invalidate cached records.
- Directly re-export `generateMetadata` from `@kenstack/admin/AdminPage` alongside `export default createAdminPage()`. `createAdminPage()` reads `deps.modules[name].client` internally, while Next.js discovers metadata through the route file's named export.
- Do not import `client.ts`, form components, list item renderers, or other admin Client Components from server module files.
- For module settings, move client-side settings field config into a module-owned `settings.ts` using `defineSettingsClient({ fields: settingsFields })`.
- Render settings controls with a module entry from the `defineAdmin(...)` registry. Do not pass a separate `loadClient` prop:

  ```tsx
  import { modules } from "@/modules";
  import ModuleSettingsControl from "@kenstack/admin/moduleSettings/Control";

  <ModuleSettingsControl module={modules.stays} title="Book a Stay Settings">
    <BookingRequest />
  </ModuleSettingsControl>;
  ```

- For custom field components, replace direct imports like `component: MyField` with loader functions such as `component: () => import("./components/MyField")`. The loaded field file should be a Client Component when it uses hooks, browser APIs, or client-only libraries.
- For any dynamic/lazy loader intended to keep optional client code out of public route bundles, make the loader file itself a Client Component. Next.js currently does not reliably keep dynamically imported Client Components split when the loader is a Server Component; `ssr: false` also only belongs inside Client Components.
- Keep loader props serializable when a Client Component loader is rendered by a Server Component.

## Unreleased: Address Field Helpers

Old APIs:

- `@kenstack/admin/address`
- `createAddressFieldOptions({ defaultCountryCode, required })`
- `addressFieldOptions`
- `requiredAddressFieldOptions`
- `addressColumns.countryCode` and the address field helpers implicitly defaulted the country to `"US"`.

New APIs:

- `@kenstack/fields/address`
- `defineAddressFields({ required, countryCode, addressLine1, addressLine2, locality, regionCode, postalCode })`
- Address field customization is keyed by field name.
- Use `countryCode: { default: "CA" }` instead of `defaultCountryCode: "CA"`.
- Address columns and fields no longer assume a country. Their default country code is now `""` unless the site sets one explicitly.

Migration steps:

- Replace direct imports from `@kenstack/admin/address` with `@kenstack/fields/address`.
- Replace `createAddressFieldOptions(...)` with `defineAddressFields(...)`.
- Spread address field bundles directly into the field map instead of assigning the bundle and copying each field one by one.
- Review every table that spreads `addressColumns` and every field map that uses `defineAddressFields(...)`. Keep their country defaults aligned.
- Existing database columns retain their previous default until a migration changes it. Generate and apply a migration that sets `country_code` to `DEFAULT ''`, or deliberately retain the site's country with an explicit default such as `DEFAULT 'US'` or `DEFAULT 'CA'`. This changes future inserts only; it does not rewrite existing country values.
- Sites that should keep an implicit country must also set the form default explicitly:

  ```ts
  ...defineAddressFields({
    countryCode: { default: "US" },
  }),
  ```

- Override the generated table column to match that field default:

  ```ts
  columns: {
    ...addressColumns,
    countryCode: varchar("country_code", { length: 2 })
      .notNull()
      .default("US"),
  }
  ```

- Move `defaultCountryCode` to the `countryCode` override:

  ```ts
  ...defineAddressFields({
    required: true,
    countryCode: { default: "CA" },
    addressLine1: { list: true },
    locality: { list: true },
    regionCode: { list: true },
    postalCode: { list: true },
  });
  ```

## Unreleased: Node 24 Runtime Floor

New requirement:

- Kenstack now requires Node.js 24 or newer.

Migration steps:

- Update app/package engines, local runtime managers, deployment settings, and CI images to Node.js 24 or newer.

## Unreleased: Managed Content Table Columns

Old APIs:

- The built-in `content` table defined only `id`, timestamps, `slug`, metadata, and `data` columns.

New APIs:

- The built-in `content` table is defined through `defineTable(...)`.
- This adds the standard managed columns and indexes used by admin records, including `public_id`, `created_by`, `deleted_at`, `content_deleted_at_idx`, and `content_created_at_idx`.

Migration steps:

- Existing sites with a `content` table need a database migration before deploying this version.
- Add the new managed columns with appropriate defaults/nullability, backfill existing rows as needed, and create the new indexes.
- Keep the existing `content_slug_unique` unique index.

## Unreleased: DateTime Field Naming

Old APIs:

- `DateField` from `@kenstack/forms/DateField` and `@kenstack/admin/forms`.

New APIs:

- `DateTimeField` from `@kenstack/forms/DateTimeField` and `@kenstack/admin/forms`.
- `DateField` now means a date-only field that stores `YYYY-MM-DD` values.
- `dateField()` is available from `@kenstack/fields/client` for date-only fields.

Migration steps:

- Replace imports and JSX usage of `DateField` with `DateTimeField` when the field stores a date and time.
- Audit the corresponding Drizzle column before renaming. Fields backed by `dateTimeField()` should use a timestamp/datetime column, not a Postgres `date` column.
- Keep domain date-only fields, such as birthdays or death dates, on Postgres `date` columns and use `dateField()`.

## Unreleased: Draft Mode Preview Transport

Old APIs:

- Public preview URLs used a `?preview` search parameter.
- `isPreview(searchParams)` checked the preview search parameter.
- Public page/list queries accepted options such as `{ preview: boolean }`.
- `pageWhere(table, { preview })` used the preview flag to include drafts.
- `createMetadataLoader` was exported from `@kenstack/admin` and `@kenstack/admin/metadata`.
- Site admin API routes only needed to expose `POST` from `adminPipeline(...)`.

New APIs:

- Preview uses Next.js Draft Mode through the admin API GET route.
- Admin preview links use `/api/admin?action=enable-draft&next=/path`.
- Draft Mode can be disabled with `/api/admin?action=disable-draft&next=/path`.
- Modules with a `slug` field default to `/${name}/${slug}` preview paths.
- `draftMode()` from `next/headers` checks the current request's Draft Mode state.
- Public page/list queries should accept options such as `{ draft: boolean }`.
- `listWhere(table, { draft })` and `pageWhere(table, { draft })` use the Draft Mode flag to include drafts while preserving their distinct public list/page visibility rules.
- `createMetadataLoader` is available from `@kenstack/admin/queries` so server-only Draft Mode imports do not leak through the main admin barrel.
- Site admin API routes must expose both `GET` and `POST` from `adminPipeline(...)`.

Migration steps:

- Update site admin API routes from `export const { POST } = adminPipeline({ adminConfig })` to `export const { GET, POST } = adminPipeline()`. Admin modules are now loaded from `deps.modules`.
- Replace `isPreview(searchParams)` with `(await draftMode()).isEnabled` from `next/headers`.
- Replace `createMetadataLoader` imports from `@kenstack/admin` or `@kenstack/admin/metadata` with `@kenstack/admin/queries`.
- Rename local query options from `preview` to `draft`; pass `{ draft }` to `listWhere(...)` for list queries and `pageWhere(...)` for detail/page queries.
- Remove `preview` search parameter propagation from public links, breadcrumbs, back buttons, tag links, and list/detail links.
- Keep module `admin.preview` path templates; they still define the preview target path, but the admin preview button now routes through Draft Mode before redirecting to that path.
- Remove explicit `admin.preview` when it only matches the default `/${name}/${slug}` path.
- Use normal links or anchors, not prefetched Next links, for disable-draft URLs so prefetching cannot clear Draft Mode before the user clicks.

## Unreleased: Media Table And Media List Field Naming

Old APIs:

- `images` database table.
- `image_kind` and `image_status` enum names.
- `defineMedia(...)` for ordered media join tables.
- `mediaField(...)` and `<MediaField />` for ordered multi-media fields.
- Internal field kind `"media"`.
- Ordered media join tables used `image_id` and index/FK names such as `blog_media_blog_id_image_id_unique`.
- `SelectedImage`, `selectImage(...)`, and `selectImageSubquery(...)` for media selector helpers.

New APIs:

- `media` database table.
- `media_kind` and `media_status` enum names.
- `defineMediaList(...)` for ordered media join tables.
- `mediaListField(...)` and `<MediaListField />` for ordered multi-media fields.
- Internal field kind `"media-list"`.
- Ordered media join tables use `media_id`, `blog_media_unique`, `blog_media_sort_order_idx`, `blog_media_blog_fk`, and `blog_media_media_fk` style names.
- `SelectedMedia`, `selectMedia(...)`, and `selectMediaSubquery(...)` for media selector helpers.

Migration steps:

- Rename `images` to `media`, `image_kind` to `media_kind`, and `image_status` to `media_status`.
- Rename ordered media join columns from `image_id` to `media_id`.
- Rename imports from `defineMedia` to `defineMediaList`.
- Rename field helper and component imports from `mediaField` / `MediaField` to `mediaListField` / `MediaListField`.
- Rename selector helper imports from `SelectedImage`, `selectImage`, and `selectImageSubquery` to `SelectedMedia`, `selectMedia`, and `selectMediaSubquery`.
- Keep singular image fields such as `image`, `ogImage`, or `avatar` named for their domain role; those fields can still store ids from the generalized `media` table.
- Keep `"original"` and `"square"` selector variants where image renditions are needed. File media ignores the variant and returns its source URL with null dimensions.

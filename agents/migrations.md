# Kenstack Migrations

Use this file to document breaking Kenstack API changes that downstream sites may need to apply.

## Unreleased: Flat Server Field Behavior

Old APIs:

- `serverFields(...)` resolvers returned server behavior inside `{ behavior: { ... } }`.
- Resolved server fields exposed lifecycle and query behavior through `field.behavior`, such as `field.behavior.save` and `field.behavior.select`.
- Server filter configuration was stored at `field.behavior.filter`, alongside the client field's `filter: boolean` option.
- Custom resolver helpers used the `ServerFieldDefaults` return type.

New APIs:

- `serverFields(...)` resolvers return `load`, `save`, `preSave`, `delete`, `select`, `listSelect`, `upload`, and other server properties directly.
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
    title: () => ({
      preSave: validateTitle,
      select: selectTitle,
    }),
  });
  ```

- Remove `ServerFieldDefaults` return annotations from custom server-field helpers. Let TypeScript infer the return type, use `ServerField` for a direct field contribution, or use `ServerFieldResolver` for a helper that receives the client field.
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
- `reorder: true` adds the standard `sortOrder` column.
- `list.reorder: true` uses the standard `sortOrder` field. Use `{ field, label }` only for custom reorder columns or labels.
- `publish: true` adds the standard `visibility` and `publishedAt` columns.
- `seo: true` adds the standard `seoTitle`, `seoDescription`, and `ogImage` columns.
- Isomorphic `defineFields(...)` from `@kenstack/admin/fields` is the single field-map authoring API.
- `defineFields({ fields: { ... } })` defines plain field maps.
- `defineFields({ publish: true, fields: { ... } })` adds the standard `visibility` and `publishedAt` field definitions.
- `defineFields({ seo: true, fields: { ... } })` adds the standard `seoTitle`, `seoDescription`, and `ogImage` field definitions.
- `publicId: false` opts a table out of the generated `publicId` column.
- `AdminTable` represents the base defined-table contract. Use `AdminPublicIdTable`, `AdminPublishTable`, or `AdminSeoTable` when code requires those generated columns.

Migration steps:

- For admin modules with `admin.list.reorder.field = "sortOrder"`, remove the manual `sortOrder` column from `columns` and set `reorder: true` on `defineTable(...)`.
- Replace standard `list.reorder = { field: "sortOrder" }` with `list.reorder = true`.
- For admin modules with standard publishing fields, remove manual `visibility: metaColumns.visibility` and `publishedAt: metaColumns.publishedAt` columns and set `publish: true` on `defineTable(...)`.
- For admin modules with standard SEO fields, remove manual `seoTitle`, `seoDescription`, and `ogImage` meta columns and set `seo: true` on `defineTable(...)`.
- Replace field-map imports from `@kenstack/fields/defineFields` with `@kenstack/admin/fields`.
- Replace `defineAdminFields(...)` with `defineFields(...)` from `@kenstack/admin/fields`.
- Wrap plain field maps in the new object shape, changing `defineFields({ title: textField() })` to `defineFields({ fields: { title: textField() } })`.
- For admin field maps with standard publishing fields, use `defineFields({ publish: true, fields: { ... } })` and remove the manual `metaFieldOptions` entries.
- For admin field maps with standard SEO fields, use `defineFields({ seo: true, fields: { ... } })` and remove the manual `metaFieldOptions` entries.
- For table types or helpers that require `table.publicId`, use `AdminPublicIdTable`.
- Omitted `publicId` currently preserves the legacy generated `publicId` column. Use `publicId: false` only after verifying the table does not need opaque public IDs.

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
- Add a server-only loader map in the site, for example:

  ```ts
  import "server-only";
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

- Use the old admin route syntax: `export default createAdminPage()`. `createAdminPage()` reads `deps.modules[name].client` internally.
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

## Unreleased: Field Set Super Refinements

Old APIs:

- Field helpers accepted `recordRefinement` on individual field options.
- Cross-field validation was attached to one field even when it validated the whole record.
- `defineFields({ ... })` from `@kenstack/fields/defineFields` collected per-field `recordRefinement` hooks and applied them to the object schema.

New APIs:

- Field maps use `defineFields({ superRefine, fields: { ... } })` from `@kenstack/admin/fields`.
- `superRefine` matches Zod's object-level `.superRefine((values, ctx) => { ... })` callback shape.
- Use `ctx.addIssue({ path: ["fieldName"], ... })` to place a whole-record validation error on a specific field.
- Reusable field bundles may attach their own field-set `superRefine` metadata internally; callers spread the bundle as before.

Migration steps:

- Move cross-field validation from a field's `recordRefinement` option to the surrounding `defineFields({ superRefine, fields })` call.
- Rename callback intent to match Zod semantics, for example `validateAgeRange` remains a `(values, ctx)` function passed as `superRefine`.
- Remove `recordRefinement` from field helper calls:

  ```ts
  export const fields = defineFields({
    superRefine: validateAgeRange,
    fields: {
      minAge: numberField({ ... }),
      maxAge: numberField({ ... }),
    },
  });
  ```

## Unreleased: Shared List Utilities

Old APIs:

- `@kenstack/admin/List/FilterControl`
- `@kenstack/admin/List/KeywordSearch`
- `@kenstack/admin/List/SortControl`
- `@kenstack/admin/List/useQueryStore`
- `@kenstack/admin/lib/listQuerySchema`

New APIs:

- `@kenstack/list/FilterControl`
- `@kenstack/list/KeywordSearch`
- `@kenstack/list/SortControl`
- `@kenstack/list/useQueryStore`
- `@kenstack/list/querySchema`

Migration steps:

- Replace shared list utility imports from `@kenstack/admin/List/...` and `@kenstack/admin/lib/listQuerySchema` with the matching `@kenstack/list/...` path.

## Unreleased: Pipeline Stage Access Option

Old APIs:

- `pipelineStage({ role: "admin" }, action)`

New APIs:

- `pipelineStage({ access: "admin" }, action)`
- `access` uses Kenstack auth access values, including `"authenticated"`, a role name, or a readonly role array.

Migration steps:

- Rename `pipelineStage` option keys from `role` to `access`.
- Use `access: "authenticated"` for actions that only require a signed-in user.
- Use role values such as `access: "admin"` for actions that require a specific role.

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

## Unreleased: Form Control Import Paths

Old APIs:

- `@kenstack/components/forms/Combobox`
- `@kenstack/components/forms/InputGroup`

New APIs:

- `@kenstack/forms/controls/Combobox`
- `@kenstack/forms/controls/InputGroup`

Migration steps:

- Replace imports from `@kenstack/components/forms/Combobox` with `@kenstack/forms/controls/Combobox`.
- Replace imports from `@kenstack/components/forms/InputGroup` with `@kenstack/forms/controls/InputGroup`.
- Keep RHF-bound form fields, such as `ComboboxField`, imported from `@kenstack/forms/*` or `@kenstack/admin/forms`.

## Unreleased: Combobox Option Shape

Old APIs:

- `Combobox` accepted arbitrary item shapes.
- Callers supplied label and equality behavior with props such as `itemToStringLabel` and `isItemEqualToValue`.
- `Combobox` `value` was the selected item object, and `onValueChange` received the selected item or `null`.

New APIs:

- `Combobox` uses the same option shape as `Select`: `{ value: string, label: string, description?, icon?, keywords? }`.
- `value` is the selected option value string.
- `onValueChange` receives `(value, option)`, with `option` set to `null` when the combobox is cleared.
- Built-in browser filtering uses `label`, `value`, and optional `keywords`.
- Remote-search comboboxes should keep `filter={null}` and normalize API rows to the shared option shape before passing them to `Combobox`.

Migration steps:

- Replace arbitrary combobox item arrays with option arrays using at least `value` and `label`.
- Remove `itemToStringLabel` and `isItemEqualToValue`; use stable string `value` fields instead.
- Change `value={selectedItem}` to `value={selectedValue}`.
- Change `onValueChange={(item) => ...}` to `onValueChange={(value, option) => ...}`.
- For domain records that do not naturally use this shape, add a narrow adapter at the API/query boundary where practical. For example, map `{ id, label }` to `{ id, label, value: String(id) }`, or `{ slug, name }` to `{ slug, name, value: slug, label: name }`.

## Unreleased: Popover Import Path

Old APIs:

- `@kenstack/components/ui/popover`

New APIs:

- `@kenstack/components/Popover`

Migration steps:

- Replace imports of `Popover`, `PopoverContent`, and `PopoverTrigger` from `@kenstack/components/ui/popover` with `@kenstack/components/Popover`.

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

## Unreleased: Option List Object Shape

Old APIs:

- Choice options were tuple-based, for example `["admin", "Administrator"]` or `["published", "Published", "Visible publicly"]`.
- Icon options used a mixed tuple shape such as `["published", "Published", { icon, description }]`.

New APIs:

- Choice options use object entries: `{ value: "admin", label: "Administrator" }`.
- Optional metadata uses the same object: `{ value, label, description, icon }`.
- This applies to checkbox lists, radio button fields, icon choice fields, admin filter options, and built-in visibility options.

Migration steps:

- Replace `[value, label]` with `{ value, label }`.
- Replace `[value, label, description]` with `{ value, label, description }`.
- Replace `[value, label, { icon, description }]` with `{ value, label, icon, description }`.
- Update tuple reads such as `option[0]` or `([value]) => ...` to use `option.value`.

## Unreleased: Admin Load API Removal

Old APIs:

- Admin edit screens loaded records through the admin API with `{ action: "load" }`.
- `loadAction` existed at `@kenstack/admin/api/load`.

New APIs:

- Admin edit screens load records on the server inside `<Edit />` through `loadAdminEdit` from `@kenstack/admin/queries/load`.
- Cached admin record loads use cache tags from `adminLoadCacheTag(...)`.

Migration steps:

- Remove client `useQuery` calls that post `{ action: "load" }` to `/api/admin`.
- Let `<AdminEdit />` load the server edit data before passing it into `AdminEditProvider`.
- Use `adminLoadCacheTag(...)` with save/remove actions to revalidate cached edit records.

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

## Unreleased: Admin Module And Page Editor Imports

Old APIs:

- `@kenstack/modules` for `defineModule` and admin module types.
- `@kenstack/pageEditor`
- `@kenstack/pageEditor/*`

New APIs:

- `@kenstack/admin` for `defineModule`, `AdminDefinition`, and common admin module-facing exports.
- `@kenstack/admin` for direct admin module infrastructure imports.
- `@kenstack/admin/pageEditor`
- `@kenstack/admin/pageEditor/*`

Migration steps:

- Replace `import { defineModule } from "@kenstack/modules"` with `import { defineModule } from "@kenstack/admin"`.
- Replace module infrastructure imports from `@kenstack/modules` with `@kenstack/admin`.
- Replace `@kenstack/pageEditor` imports with `@kenstack/admin/pageEditor`.
- Keep imports for actual bundled modules, such as `@kenstack/modules/users` and `@kenstack/modules/siteSettings`, unchanged until those module folders move.

## Unreleased: Field Record Helpers

Old APIs:

- `@kenstack/records`
- `@kenstack/records/saveRecord`

New APIs:

- `@kenstack/fields/records`
- `@kenstack/fields/records/saveRecord`
- Record helpers are intentionally not exported from the client-facing `@kenstack/fields` or `@kenstack/admin` barrels because they depend on server-only auth/database APIs.

Migration steps:

- Replace `@kenstack/records` imports with `@kenstack/fields/records`.
- Replace `@kenstack/records/saveRecord` imports with `@kenstack/fields/records/saveRecord`.
- Replace any `saveRecord` or revision helper imports from `@kenstack/fields` or `@kenstack/admin` with the explicit `@kenstack/fields/records` subpath.
- Treat record save helpers as part of the field lifecycle layer, not a top-level Kenstack package boundary.

## Unreleased: Zod Schema Imports

Old APIs:

- `@kenstack/schemas`
- `@kenstack/schemas/atoms`
- `@kenstack/schemas/atoms/email`
- `@kenstack/schemas/atoms/password`
- `@kenstack/schemas/atoms/tags`

New APIs:

- `@kenstack/zod/email`
- `@kenstack/zod/password`
- `@kenstack/zod/tags`
- Existing image and gallery schemas remain under `@kenstack/zod/image` and `@kenstack/zod/gallery`.

Migration steps:

- Replace `import { email } from "@kenstack/schemas/atoms"` with `import { email } from "@kenstack/zod/email"`.
- Replace `import { password } from "@kenstack/schemas/atoms"` with `import { password } from "@kenstack/zod/password"`.
- Replace `import tagsSchema from "@kenstack/schemas/atoms/tags"` with `import { tagsSchema } from "@kenstack/zod/tags"`.
- Use the exported schemas directly, for example `email` instead of `email()` and `password.min(...)` instead of `password().min(...)`.
- Remove mode-based schema factories; Kenstack no longer uses client/server schema modes.

## Unreleased: Module-First Admin Config

Old APIs:

- Per-module `adminConfig(...)` values, often kept in `admin.ts`.
- `defineAdmin({ modules })` as the admin registry builder.
- Top-level special admin config such as `tags`, `galleries`, and `relationships`.
- Client list item tuples that could request hidden server selection fields.

New APIs:

- `defineModule(...)` owns server/module admin config directly.
- Admin registries are plain typed objects of module configs.
- Shared field definitions stay in `fields.ts`; server-only field patches use `serverFields(...)`.
- Special field behavior is attached with field handlers such as `tagHandler(...)`, `galleryHandler(...)`, and `relationshipHandler(...)`.
- Client `defineClient(...)` owns presentation-only config, including tuple-based `listItems`.

Migration steps:

- Move `adminConfig(...)` options into each module's `index.ts` `defineModule(...)` call.
- Delete old per-module `admin.ts` files instead of re-exporting them.
- Replace `defineAdmin({ modules: [...] })` with a plain object, for example `{ users, siteSettings, blog } satisfies AdminDefinition`.
- Replace top-level `tags`, `galleries`, and `relationships` with direct `serverFields(...)` behavior patches, for example `serverFields(fields, { tags: tagHandler({ table }) })`.
- Use `galleryHandler({ table })` for standard `defineImageGallery(...)` tables; pass column/key overrides only for custom gallery relation shapes.
- Move server-only schemas such as date coercion into `serverFields(...)` by patching `zod`.
- Use field-name sort and filter references by default, for example `fields: ["title"]`; keep Drizzle columns only for custom escape hatches.
- Mark list row data on fields with `list: true` or image variants such as `list: "square"`.
- Update client list renderers to tuples like `[(row) => <span>{row.title}</span>, { className: "text-xs" }]`; renderers must only use row data selected by field `list` metadata.

## Unreleased: Field Helper Metadata

Old APIs:

- Public field `kind` values such as `{ kind: "image" }`, `{ kind: "email" }`, and `{ kind: "text" }`.
- Generated settings forms switched on field `kind`.
- `serverFields(fields, { tags: { handler: tagHandler(...) } })` was the only field-handler patch shape.

New APIs:

- Use field helpers such as `textField(...)`, `emailField(...)`, `imageField(...)`, `galleryField(...)`, `tagField(...)`, `relationshipField(...)`, and `checkboxListField(...)`.
- Field helpers attach internal `kind` metadata and a client form component where applicable.
- Generated settings forms render the field helper's component metadata.
- `serverFields(...)` accepts behavior bundles directly, for example `serverFields(fields, { tags: tagHandler(...) })`.

Migration steps:

- Replace public `kind` field definitions with field helpers, for example `ogImage: imageField()` and `to: emailField()`.
- Field maps passed to `defineFields({ fields: { ... } })` expect helper-created fields; raw `{ default, zod }` objects should become helpers such as `textField({ default, zod })`.
- Keep plain object fields only when no built-in form component or built-in field behavior is needed.
- For generated settings forms, define settings fields with helpers so each field has a component.
- Prefer direct server behavior patches such as `tags: tagHandler({ table })`; `{ handler: ... }` remains accepted for transitional code.

## Unreleased: Account Menu Items Prop

Old APIs:

- `createDeps({ accountMenu: { getItems } })`
- `deps.accountMenu?.getItems()` consumed by `@kenstack/components/AccountMenu`

New APIs:

- `@kenstack/components/AccountMenu` accepts an `items` prop.
- `AccountMenuItems` is exported from `@kenstack/components/AccountMenu`.
- `items` can be either static menu items or a user-aware resolver.
- `@kenstack/admin/Sidebar` accepts an `accountMenu` prop for site-provided account menu UI.

Migration steps:

- Move account menu item configuration from `createDeps(...)` to the site component that renders `AccountMenu`.
- Import `AccountMenuItems` or `AccountMenuItemsResolver` from `@kenstack/components/AccountMenu` when a typed item list or resolver is useful.
- Pass items directly, for example `<AccountMenu items={accountMenuItems} fallback={...} />`, or pass a resolver when items depend on the current user.
- Pass site-provided account menu UI to admin layouts with `<Sidebar accountMenu={<SiteAccountMenu fallback={null} />} ... />`.

## Unreleased: Admin Config Naming

Old APIs:

- `adminTable(...)`
- `AdminTable` for an individual admin config
- `AnyAdminTable`
- `adminConfig([...])`
- `AdminConfig` for the admin collection
- `adminRegistry([...])`
- `AdminRegistry`
- `MetaTable`
- `MetaSingletonTable`
- `defineSingleton(...)`

New APIs:

- `defineModule(...)` for module-facing admin configuration.
- `resolveAdminConfig(...)` for Kenstack internals that normalize table config.
- `AdminConfig` for unresolved table config.
- `AnyAdminConfig`
- Plain typed admin registry objects, for example `{ users, blog } satisfies AdminDefinition`.
- `AdminDefinition`
- `AdminModules`
- `AdminModuleMap`
- `AdminTable`
- `defineKeyTable(...)`
- `AdminKeyTable`
- `AdminSingleConfig`
- `AnyAdminTableConfig`
- `AnyAdminSingleConfig`

Migration steps:

- Replace module-level `adminTable(...)` / `adminConfig(...)` usage with `defineModule(...)`.
- Replace collection-level `adminConfig(...)`, `adminRegistry(...)`, or `defineAdmin({ modules })` with a plain typed object, for example `{ users, siteSettings, blog } satisfies AdminDefinition`.
- Define admin modules as an object keyed by route/module name, not an array of `[name, config]` tuples.
- Import Kenstack defaults such as `users` and `siteSettings` into the site registry explicitly when the site wants them.
- Replace config-type `AdminTable` with `AdminConfig`.
- Replace `AnyAdminTable` with `AnyAdminConfig`.
- Replace collection-level `AdminConfig` or `AdminRegistry` with `AdminDefinition`.
- Rename route/component props that pass the admin collection to `admin`.
- Replace table-shape `MetaTable` with `AdminTable`.
- Replace table-shape `MetaSingletonTable` with `AdminKeyTable`.
- Replace `defineSingleton(...)` with `defineKeyTable(...)`.
- Normal table configs now resolve with `single: false`.
- Keyed single admin configs now pass `key: string` and resolve with `single: true`.
- Single admin configs cannot define list-only options: `select`, `sort`, `filters`, or `limit`.

## Unreleased: Admin Modules In Deps

Old APIs:

- Site admin routes imported a local admin registry and passed it into `createAdminPage({ adminConfig })`.
- Site admin API routes passed the local admin registry into `adminPipeline({ adminConfig })`.
- `Sidebar` accepted an `admin` prop containing the admin module registry.

New APIs:

- Sites pass the resolved module registry into `createDeps({ modules })`.
- `createAdminPage()` reads `deps.modules` internally.
- `adminPipeline()` reads `deps.modules` internally.
- `Sidebar` reads `deps.modules` internally and no longer accepts an `admin` prop.

Migration steps:

- Move the site admin module assembly into a module-owned file, such as `src/modules/index.ts`.
- Pass that registry to `createDeps({ modules })`.
- Replace `createAdminPage({ adminConfig })` with `createAdminPage()`.
- Replace `adminPipeline({ adminConfig })` with `adminPipeline()`.
- Remove the `admin` prop from `Sidebar`.

## Unreleased: Admin Page Query Select

Old APIs:

- `pageQuery({ table, columns, ... })`
- `listQuery(...)`
- `adminListWhere(...)`
- `adminPageWhere(...)`
- `adminPreviewWhere(...)`

New APIs:

- `pageQuery({ table, select: { ... }, ... })`
- `customPageQuery({ table, query: ({ table, where }) => ... })` for advanced page queries
- Local Drizzle list queries
- `listWhere(...)`
- `pageWhere(...)`
- `previewWhere(...)`

Migration steps:

- Rename `pageQuery`'s `columns` option to `select`.
- Keep computed Drizzle selections inside `select`, for example `image: selectMediaSubquery(services.image, "square")`.
- Keep `where`, `cache`, and `preview` unchanged.
- Use `customPageQuery` only when the page query needs custom joins or clauses that the simple `pageQuery` select option cannot express. The callback receives Kenstack's computed admin visibility predicate as `where`.
- Replace `listQuery` with normal Drizzle list queries locally so ordering, joins, and module-specific behavior stay explicit.
- Replace `adminListWhere`, `adminPageWhere`, and `adminPreviewWhere` with `listWhere`, `pageWhere`, and `previewWhere`.

## Unreleased: Admin Meta Query

Old APIs:

- `metaQuery({ title })`

New APIs:

- `metaQuery(...)` reads common metadata columns from the admin content table and only uses `title` or `description` when those columns exist.

Migration steps:

- Remove `title` callbacks from `metaQuery` calls.
- Pass `image` explicitly for alternate image columns, for example `image: users.avatar`.
- Keep site-specific title composition in the site's page or metadata code instead of Kenstack's shared meta query.

## Unreleased: Admin API Actions

Old APIs:

- Default exports from `@kenstack/admin/api/list`, `load`, `save`, `remove`, `tags`, and `relationships` that accepted `{ request, json, adminConfig }` and ran `pipeline(...)`.
- Admin API action string `relationships` for relationship option searches.
- `getPresignedUrlPipeline`, `uploadCompletePipeline`, and `impersonatePipeline`.

New APIs:

- Named action factories: `listAction`, `loadAction`, `saveAction`, `removeAction`, `tagsAction`, `relationshipSearchAction`, `getPresignedUrlAction`, `uploadCompleteAction`, and `impersonateAction`.
- Admin API action string `relationship-search`.

Migration steps:

- Import action factories and run them through `pipeline({ request, json }, [action(adminConfig)])`.
- Keep compatibility guards inside the action factory rather than in the API dispatch switch.
- Replace `relationshipsAction` imports with `relationshipSearchAction` from `@kenstack/admin/api/relationshipSearch`.
- Replace relationship option search requests using `action: "relationships"` with `action: "relationship-search"`.

## Unreleased: API Module Promotion

Old APIs:

- `@kenstack/lib/api`
- `@kenstack/lib/api/PipelineResponse`
- `@kenstack/lib/fetcher`

New APIs:

- `@kenstack/api`
- `@kenstack/api/PipelineResponse`
- `@kenstack/api/fetcher`

Migration steps:

- Replace imports from `@kenstack/lib/api` with `@kenstack/api`.
- Replace imports from `@kenstack/lib/api/PipelineResponse` with `@kenstack/api/PipelineResponse`.
- Replace imports from `@kenstack/lib/fetcher` with `@kenstack/api/fetcher`.

## Unreleased: Auth Require User

Old APIs:

- `requireUser({ role: "admin" })`
- `requireUser({ role: ["admin", "editor"] })`
- `requireUser({ redirectTo: "/somewhere" })`

New APIs:

- `requireUser("admin")`
- `requireUser(["admin", "editor"])`
- `requireUser()`

Migration steps:

- Pass the required role or roles directly to `requireUser`.
- Remove `redirectTo`; `requireUser` now redirects to `/login`.

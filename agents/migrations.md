# Kenstack Migrations

Use this file to document breaking Kenstack API changes that downstream sites may need to apply.

## Unreleased: Node 24 Runtime Floor

New requirement:

- Kenstack now requires Node.js 24 or newer.

Migration steps:

- Update app/package engines, local runtime managers, deployment settings, and CI images to Node.js 24 or newer.

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
- `pageWhere(table, { draft })` uses the Draft Mode flag to include drafts.
- `createMetadataLoader` is available from `@kenstack/admin/queries` so server-only Draft Mode imports do not leak through the main admin barrel.
- Site admin API routes must expose both `GET` and `POST` from `adminPipeline(...)`.

Migration steps:

- Update site admin API routes from `export const { POST } = adminPipeline({ adminConfig })` to `export const { GET, POST } = adminPipeline({ adminConfig })`.
- Replace `isPreview(searchParams)` with `(await draftMode()).isEnabled` from `next/headers`.
- Replace `createMetadataLoader` imports from `@kenstack/admin` or `@kenstack/admin/metadata` with `@kenstack/admin/queries`.
- Rename local query options from `preview` to `draft` and pass `{ draft }` to `pageWhere(...)`.
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

New APIs:

- `media` database table.
- `media_kind` and `media_status` enum names.
- `defineMediaList(...)` for ordered media join tables.
- `mediaListField(...)` and `<MediaListField />` for ordered multi-media fields.
- Internal field kind `"media-list"`.
- Ordered media join tables use `media_id`, `blog_media_unique`, `blog_media_sort_order_idx`, `blog_media_blog_fk`, and `blog_media_media_fk` style names.

Migration steps:

- Rename `images` to `media`, `image_kind` to `media_kind`, and `image_status` to `media_status`.
- Rename ordered media join columns from `image_id` to `media_id`.
- Rename imports from `defineMedia` to `defineMediaList`.
- Rename field helper and component imports from `mediaField` / `MediaField` to `mediaListField` / `MediaListField`.
- Keep singular image fields such as `image`, `ogImage`, or `avatar` named for their domain role; those fields can still store ids from the generalized `media` table.

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
- `defineFields(...)` now expects helper-created fields; raw `{ default, zod }` objects should become helpers such as `textField({ default, zod })`.
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
- Keep computed Drizzle selections inside `select`, for example `image: selectImageSubquery(services.image, "square", { shape: "src" })`.
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

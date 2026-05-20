# Kenstack Migrations

Use this file to document breaking Kenstack API changes that downstream sites may need to apply.

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

- `adminConfig(...)`
- `AdminConfig`
- `AnyAdminConfig`
- `defineAdmin({ modules })`
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

- Replace imports/usages of `adminTable` with `adminConfig`.
- Replace imports/usages of collection-level `adminConfig` or `adminRegistry` with `defineAdmin({ modules })`.
- Define admin modules as an object keyed by route/module name, for example `defineAdmin({ modules: { users, blog } })`, not an array of `[name, config]` tuples.
- `defineAdmin` includes Kenstack's default `users` module. Downstream sites may replace it by defining their own `users` module key.
- `defineAdmin` includes Kenstack's default `siteSettings` module after `users`. The module uses the `site_settings` keyed table, which is exported from `@kenstack/db/tables`.
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

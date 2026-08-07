# Kenstack Anatomy

Consult this reference for Kenstack repository layout and the internal structure of a Kenstack area.
Use `docs/module-anatomy.md` instead for the inside of any registered module, including host modules.
Cross-cutting ownership, type, helper, and file-shape rules live in `docs/code-organization.md`.

## Dependency boundary

Kenstack must not import host-site modules directly, including `@/`, root `src/`, relative paths into a
host application, or site module paths. Host dependencies enter through the explicit `@app/deps` or
`@app/deps/*` boundary. Committed Kenstack entry points are host-facing public contracts.

## Top-level areas

Each top-level `src` area has one owner. Add a new area only when an existing owner cannot contain a
real independent capability.

- `admin/` — admin application assembly, record-management UI, and admin-facing entry points.
- `api/` — shared HTTP infrastructure that is not owned by a narrower feature.
- `auth/` — authentication, sessions, credentials, and their handlers, schemas, and messages.
- `components/` — reusable Kenstack UI not owned by a narrower feature.
- `context/` — shared React context contracts and providers.
- `db/` — database infrastructure and Kenstack-owned shared tables.
- `deps/` — the typed host-dependency boundary and its test harness.
- `fields/` — reusable field definitions and every surface owned by those fields.
- `forms/` — general form infrastructure and stable form-facing component entry points. Field-specific
  editor implementations belong to their field units; forwarding entry points provide consistent
  `@kenstack/forms/*` imports without taking ownership from those units.
- `hooks/` — reusable React hooks with multiple production consumers and no narrower owner.
- `icons/` — Kenstack-owned icon assets and icon registry code.
- `lib/` — cross-feature helpers that have passed the helper ladder and have no narrower owner.
- `list/` — reusable list configuration and filtering infrastructure.
- `logger/` — logging contracts and implementations.
- `modules/` — Kenstack's registered modules; each follows `docs/module-anatomy.md`.
- `records/` — whole-record loading, selection, saving, and revision shaping.
- `pageRoute.tsx` — the host-facing page-route entry point; keep it a file until multiple owned files
  require a folder.
- `types/` — a shrinking compatibility location. Add no ownerless types; relocate existing types beside
  their owners when the relevant contract is changed.

There is no top-level `zod/` owner. Validation schemas belong to their field or other domain owner and
may be exported from that owner for external consumers; implementation library choice does not create
ownership.

Top-level files and folders that do not meet one of these ownership descriptions are transitional, not
new destinations. Resolve them toward a named owner rather than documenting the accident.

## Field library

`src/fields/index.ts` is the isomorphic public aggregate for reusable field definitions. Keep a field's
complete one-file implementation in that aggregate. When the field owns more than one file, promote the
whole field to `src/fields/<name>/`; its schema moves with it and the aggregate imports its public
definition. External consumers may import a schema or other supported contract from the field owner.

A multi-file field unit uses only the surfaces it needs:

- `index.ts` — isomorphic definition, schema, value types, defaults, and isomorphic helpers.
- `server.ts` — optional server schema override and server-only lifecycle behavior; imports
  `"server-only"`.
- `Component.tsx` — optional owned editor; starts with `"use client"`.
- Additional files — only field-owned helpers or assets that have independently earned a file.

The field's public isomorphic definition never imports its server implementation or editor component.
Standard editors come from the built-in client field-kind registry. A consuming form imports
`defineFormFields(...)` from the client-only `@kenstack/fields/formFields` entry, which resolves
property-specific components over those defaults and returns fixed-name generated components. Extract
that call to a module `fields/formFields.ts` only when multiple production consumers need the same
configured map. Unresolved fields are omitted because the form may render them through bespoke panels.
`defineClient(...)` receives only the bare isomorphic definitions and does not import or resolve editor
components. Relation forms pass the field subset they render and their `prefix` directly to
`defineFormFields(...)`; there is no separate resolved component-bearing field map. Several fields may
use a shared primitive without adding wrappers for symmetry.

`@kenstack/fields/formFields` is client-only and includes admin-aware editors; its ownership under
`fields/` does not make it an isomorphic or public-form entry. Ordinary public forms use the stable
`@kenstack/forms/*` component entry points and controls instead of importing the admin editor registry.
Those component entry points may forward to field-owned implementations and remain intentional public
APIs.

Use `field({ kind, zod, default })` for a concrete field definition. A one-off module-local field that
is registered by property may omit `kind`; `defineFields(...)` normalizes its property name into the
resolved kind. Its `default` retains the literal initial value; the field's accepted input and output
types are owned independently by `zod`. Every reusable field helper must be created with
`defineField(...)` and declare an explicit semantic kind. If `defineField(...)` cannot express a
reusable helper, extend it instead of hand-writing a wrapper around `field(...)`.

Write `default` as a bare value. `field(...)` derives empty array and object seed types from the schema,
preserves `null` and other literal defaults, and rejects incompatible defaults. Kenstack's ESLint config
rejects type assertions on field defaults; `as const` stays allowed because it can only pin the literal
already present, never assert a foreign type. Derive editable and saved value types with `z.input` and
`z.output` from the field's schema.

Set `options: true` when a reusable field requires caller-supplied choices. A `zod` callback receives
those choices and constructs the configured field's schema once when the factory is called; validation
reuses that schema:

```ts
export const checkboxListField = defineField({
  kind: "checkbox-list",
  options: true,
  default: [],
  filterKind: "includes",
  zod: ({ options }) => z.array(z.enum(options.map(({ value }) => value))),
});
```

`kind` is only the implementation-registry key. Standard filterable controls use the independent
serializable `filterKind` capability. Loaded-value types come from the registered implementations: the
server field's selection result and the client field component's loaded-value contract. When assigning
a semantic kind, register the corresponding implementations rather than adding isomorphic loaded-value
flags. The page editor owns its supported inline field set; generic fields do not declare page-editor
capabilities.

Add a server definition only for a server schema override or server-only behavior. Use
`defineServerField(isomorphicField, additions)` for fixed additions and
`serverField(configuredField, resolver)` for configurable behavior. Pass a configured field: either the
result of `field(...)` or the result of calling a field factory such as `textField(...)`. Do not pass the
factory function itself. Server field-kind registries accept only the resolver returned by one of these
helpers at the typed boundary; raw `ServerField` objects are not typed registrations. This keeps
kind, default, input, and value contracts derived from the isomorphic owner. Spread configurable
additions before `kind` so the owner's canonical identity cannot be replaced.

`fields/server.ts` is the server-only public behavior and resolution aggregate. Root files under
`src/fields` otherwise own contracts spanning field kinds. Private implementation shared by several
fields belongs in `fields/internal`.

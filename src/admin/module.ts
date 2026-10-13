/*
 * Public surface: the admin module-definition API exposed through admin/server.
 * Export only supported host-facing APIs. Kenstack code imports non-public
 * implementation from its canonical files, not through this entry point.
 */

import "server-only";

import type { ComponentType, SVGProps } from "react";
import startCase from "lodash-es/startCase";
import type { AnyColumn, SQL } from "drizzle-orm";
import {
  extractExtendedColumnType,
  getColumnTable,
  getTableColumns,
  getTableName,
} from "drizzle-orm";

import {
  getListSelect,
  resolveOneToOneList,
} from "@kenstack/admin/queries/listRelations";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import type { SelectedFields } from "drizzle-orm/pg-core/query-builders/select.types";

import type {
  AdminFieldReference,
  AdminFilterField,
  AdminFilterFieldReference,
  AdminFilterOptions,
  AdminFilters,
  AdminListReorderOptions,
  AdminSortFieldReference,
  AdminSort,
  AdminSortField,
  AdminSortOptions,
  ResolvedAdminSortField,
} from "@kenstack/admin/types/list";
import type {
  FieldCheckedValue,
  FieldInputOption,
} from "@kenstack/fields/field";
import {
  type DefaultValuesFromFields,
  createDefaultValues,
} from "@kenstack/fields/createDefaultValues";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import {
  resolveServerFields,
  type ServerFields,
} from "@kenstack/fields/server";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";
import type { DefinedFields } from "@kenstack/admin/fields";
import { metaFieldOptions, pickMetaFields } from "@kenstack/admin/metaFields";
import type { AdminKeyTable, AdminTable } from "@kenstack/admin/table";
import type { ModuleClient } from "@kenstack/admin/client";
import type { RevalidateTagRule } from "@kenstack/lib/revalidate";
import type { AfterSaveContext } from "@kenstack/records/save";
import type { SelectedFieldValues } from "@kenstack/records/select";
import type { FieldSaveTask } from "@kenstack/fields/serverField";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import type { Role } from "@kenstack/auth/server/types";
import type { FetchError } from "@kenstack/api/fetcher";
import type { NumericIdTable } from "@kenstack/db/types";
import {
  type ResolvedOneToOneDefinition,
  resolveOneToOneDefinition,
  withOneToOneSelectionField,
} from "@kenstack/admin/internal/oneToOne";
import { relationshipFilterField } from "@kenstack/fields/relationship/server";
import { visibilityOptions } from "./lib/visibility";

type SelectValue = AnyColumn | SQL | SQL.Aliased;
type SelectShape = Record<string, SelectValue>;
type AdminManagedTable = AdminTable | AdminKeyTable;

export type PreviewPath = `/${string}`;

// The roles a module is granted to, by level: `viewers` view, `contributors` also edit,
// and `editors` also delete. Admins always have everything, so grants leave them out. A module sets
// its default; a site's registry entry that sets any level replaces it.
export type ModuleGrants = {
  viewers?: readonly Role[];
  contributors?: readonly Role[];
  editors?: readonly Role[];
};

export type AdminOneToOneBinding = {
  defaultValues: Record<string, unknown>;
  fields: ServerDefinedFields;
  foreignKey: NumericIdTable["id"];
  table: NumericIdTable;
  title: string;
  translateError?: (error: unknown) => FetchError | undefined;
  value: string;
};

export type ServerOneToOne = {
  field: ResolvedOneToOneDefinition["field"];
  relations: Record<string, AdminOneToOneBinding>;
  selectionField: ResolvedOneToOneDefinition["selectionField"];
};

type ServerOneToOneDefinition<
  TFields extends DefinedFields = DefinedFields,
  TTable extends AnyPgTable = AnyPgTable,
> = {
  fields: TFields;
  serverFields?: ServerFields<TFields>;
  table: TTable;
  title?: string;
  translateError?: (error: unknown) => FetchError | undefined;
};

type ServerOneToOneConfig = Record<string, ServerOneToOneDefinition>;

// The publication and SEO fields defineModule adds from the table flags, so
// callbacks typed from the declared fields still see the columns the row has.
type GeneratedFields<TTable extends AnyPgTable> = (TTable extends {
  visibility: AnyPgColumn;
  publishedAt: AnyPgColumn;
}
  ? Pick<typeof metaFieldOptions, "visibility" | "publishedAt">
  : Record<never, never>) &
  (TTable extends {
    seoTitle: AnyPgColumn;
    seoDescription: AnyPgColumn;
    ogImage: AnyPgColumn;
  }
    ? Pick<typeof metaFieldOptions, "seoTitle" | "seoDescription" | "ogImage">
    : Record<never, never>);

type AdminConfigBase<
  TTable extends AdminManagedTable,
  TFields extends ServerDefinedFields,
> = {
  table: TTable;
  serverFields?: ServerFields<TFields>;
  revalidate?: RevalidateTagRule<
    SelectedFieldValues<TTable, TFields & GeneratedFields<TTable>>
  >[];
  fields: TFields;
  oneToOne?: ServerOneToOneConfig;
  // The record's public page, with `${field}` placeholders; without it the editor shows no preview.
  preview?: PreviewPath;
  // Extra read-only columns loaded with the edit record, for custom edit UIs
  // that display data no editable field owns. The list counterpart is
  // `list.select`.
  select?: SelectedFields;
  translateError?: (error: unknown) => FetchError | undefined;
  // The module's own work on every save that writes one of its records, from the editor or a site form,
  // inside the save's transaction after the fields save: a failure rolls the save back. `changes` names
  // the fields the save records, and `isNew` says it inserted the row (a singleton's site-form upsert
  // always says so). A site form's `row` holds only the columns it saved; read others through `tx`.
  // Work that must wait for the commit, such as email, is returned as `afterCommit`.
  afterSave?: ModuleAfterSave<
    SelectedFieldValues<TTable, TFields & GeneratedFields<TTable>>
  >;
};

// Resolved modules share one registry, so the hook stays bivariant in its row there, as list renderers do.
type ModuleAfterSave<TRow extends { id: number } = { id: number }> = {
  bivarianceHack(
    ctx: AfterSaveContext<TRow>,
  ): Promise<{ afterCommit?: FieldSaveTask[] } | void>;
}["bivarianceHack"];

type AdminListConfig<
  TTable extends AdminTable,
  TFields extends ServerDefinedFields,
  TListSelect extends SelectShape | undefined = undefined,
> = AdminConfigBase<TTable, TFields> & {
  create?: boolean;
  list?: {
    filters?: AdminFilterOptions;
    limit?: number;
    reorder?: AdminListReorderOptions;
    sort?: AdminSortOptions;
    select?: TListSelect;
  };
};

export type AnyAdminConfig = NonNullable<ReturnType<typeof resolveAdmin>>;
export type AdminConfig<
  TTable extends AdminManagedTable,
  TFields extends ServerDefinedFields,
> = TTable extends AdminTable
  ? AdminListConfig<TTable, TFields, SelectShape | undefined>
  : AdminConfigBase<TTable, TFields>;

type AdminConfigRuntime =
  | AdminListConfig<AdminTable, ServerDefinedFields, SelectShape | undefined>
  | AdminConfigBase<AdminKeyTable, ServerDefinedFields>;

type ModuleSettingsConfig = {
  table: AdminKeyTable;
  fields: ServerDefinedFields;
  cacheTag: string;
};

export type ResolvedModuleSettings = NonNullable<
  ReturnType<typeof resolveSettings>
>;

export type ModuleParentOptions = {
  module: string;
  foreignKey: string;
};

type ModuleOptions<
  TTable extends AdminManagedTable,
  TFields extends ServerDefinedFields,
> = {
  name: string;
  title?: string;
  basePath?: PreviewPath;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  // The module's client/index.ts, which the server only passes through to client components.
  client?: ModuleClient;
  admin?: AdminConfig<TTable, TFields>;
  settings?: ModuleSettingsConfig;
  parent?: ModuleParentOptions;
} & ModuleGrants;

type ResolvedModule<
  TModule extends { name: string },
  TTable extends AdminManagedTable,
> = {
  name: TModule["name"];
  title: string;
  basePath: PreviewPath;
  icon: TModule extends { icon: infer TIcon } ? TIcon : undefined;
  client: ModuleClient | undefined;
  admin: TModule extends { admin: infer TAdmin }
    ? Omit<TAdmin, keyof AnyAdminConfig> &
        (TTable extends AdminTable
          ? Extract<AnyAdminConfig, { list: unknown }>
          : Exclude<AnyAdminConfig, { list: unknown }>) & { table: TTable }
    : undefined;
  settings: TModule extends {
    settings: infer TSettings extends ModuleSettingsConfig;
  }
    ? Omit<ResolvedModuleSettings, "table" | "defaultValues"> & {
        table: TSettings["table"];
        defaultValues: DefaultValuesFromFields<TSettings["fields"]>;
      }
    : undefined;
  parent: ModuleParentOptions | undefined;
} & ModuleGrants;

// A sidebar link to an admin page that no module owns.
export type AdminNavigationLink = {
  href: `/${string}`;
  title: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  // Who sees it; admin alone when left out.
  access?: AuthAccess;
};

// defineAdmin keeps the sidebar's groups, in registry order, beside the modules it returns;
// each item is a top-level module's name or a link, and a group of top-level links has no heading.
export const adminNavigation = Symbol("adminNavigation");

export type DefinedAdmin = Record<
  string,
  {
    name: string;
    title: string;
    basePath: PreviewPath;
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
    client?: ModuleClient;
    admin?: AnyAdminConfig;
    settings?: ResolvedModuleSettings;
    parent?: ModuleParentOptions;
    navigationParent?: string;
  } & ModuleGrants
> & {
  [adminNavigation]: {
    heading?: string;
    items: (string | AdminNavigationLink)[];
  }[];
};

export type DefinedAdminModule = DefinedAdmin[string] & {
  admin: AnyAdminConfig;
};

export type DefinedAdminListModule = DefinedAdmin[string] & {
  admin: Extract<AnyAdminConfig, { list: unknown }>;
};

// Public API: narrows defined modules to modules with admin lists.
export function isAdminListModule(
  moduleConfig: DefinedAdmin[string],
): moduleConfig is DefinedAdminListModule {
  return Boolean(moduleConfig.admin && "list" in moduleConfig.admin);
}

export function defineOneToOne<
  const TFields extends DefinedFields,
  const TTable extends AnyPgTable,
>(
  options: ServerOneToOneDefinition<TFields, TTable>,
): ServerOneToOneDefinition<TFields, TTable> {
  return options;
}

function resolveOneToOne(config: ServerOneToOneConfig): ServerOneToOne {
  const definition = resolveOneToOneDefinition(
    Object.fromEntries(
      Object.entries(config).map(([name, relation]) => [name, relation.fields]),
    ),
  );

  const relations = Object.fromEntries(
    Object.entries(config).map(([name, relationConfig]) => {
      const relation = definition.relations[name];
      if (!relation) {
        throw new Error(`Missing one-to-one definition "${name}".`);
      }
      if (!hasIdentityColumn(relationConfig.table)) {
        throw new Error(
          `One-to-one binding "${name}" requires a numeric related identity column "id".`,
        );
      }

      const fields = relationConfig.serverFields
        ? resolveServerFields(relation.fields, {
            fields: relationConfig.serverFields,
          })
        : resolveServerFields(relation.fields);

      return [
        name,
        {
          defaultValues: relation.defaultValues,
          fields,
          foreignKey: relationConfig.table.id,
          table: relationConfig.table,
          title: relationConfig.title ?? relation.title,
          translateError: relationConfig.translateError,
          value: relation.value,
        },
      ];
    }),
  );
  const selectionField = {
    ...definition.selectionField,
    options: Object.values(relations).map(({ title, value }) => ({
      label: title,
      value,
    })),
  };

  return {
    field: definition.field,
    relations,
    selectionField,
  };
}

export function defineModule<
  const TTable extends AdminManagedTable,
  const TFields extends ServerDefinedFields,
  const TModule extends ModuleOptions<TTable, TFields>,
>(
  options: TModule & {
    admin?: AdminConfig<TTable, TFields>;
  },
) {
  const admin = resolveAdmin(options.admin as AdminConfigRuntime | undefined);
  if (admin && "list" in admin && admin.list.reorder?.scope) {
    const scope = admin.list.reorder.scope;
    const scopeField = admin.fields[scope.fieldKey];
    if (!scopeField) {
      throw new Error(
        `Admin reorder scope field "${options.name}.${scope.fieldKey}" is not declared in the module fields.`,
      );
    }
    if (scopeField.save) {
      throw new Error(
        `Admin reorder scope field "${options.name}.${scope.fieldKey}" has custom save behavior; scoped reorder requires direct table-column persistence.`,
      );
    }
  }
  const resolved = {
    name: options.name,
    title: options.title ?? startCase(options.name),
    basePath: options.basePath ?? `/${options.name}`,
    icon: options.icon,
    client: options.client,
    admin,
    settings: resolveSettings(options.settings),
    parent: options.parent,
    viewers: options.viewers,
    contributors: options.contributors,
    editors: options.editors,
  };

  return resolved as ResolvedModule<TModule, TTable>;
}

function resolveSettings(settings: ModuleSettingsConfig | undefined) {
  if (!settings) {
    return undefined;
  }

  const fields = resolveServerFields(settings.fields);

  return {
    ...settings,
    fields,
    schema: createSchemaFromFields(fields),
    defaultValues: createDefaultValues(fields),
  };
}

// Record and list queries spread a configured select over the columns they
// select on their own, so an alias on one of those keys would replace it.
function assertSelectKeys(
  select: Record<string, unknown> | undefined,
  selectedKeys: string[],
  table: AnyPgTable,
  option: string,
) {
  for (const key of Object.keys(select ?? {})) {
    if (selectedKeys.includes(key)) {
      throw new Error(
        `${option} for ${getTableName(table)} cannot use the key "${key}": it is selected already.`,
      );
    }
  }
}

function resolveAdmin(admin: AdminConfigRuntime | undefined) {
  if (!admin) {
    return undefined;
  }

  const resolveBase = <
    TTable extends AdminManagedTable,
    TFields extends ServerDefinedFields,
  >(
    config: AdminConfigBase<TTable, TFields>,
  ) => {
    const publish =
      "visibility" in config.table && "publishedAt" in config.table;
    const seo =
      "seoTitle" in config.table &&
      "seoDescription" in config.table &&
      "ogImage" in config.table;
    const generatedFields = pickMetaFields({ publish, seo });
    for (const key of Object.keys(generatedFields)) {
      if (key in config.fields) {
        const flag =
          key === "visibility" || key === "publishedAt" ? "publish" : "seo";
        throw new Error(
          `Field "${key}" is generated from the table's ${flag} flag; remove it from the module fields.`,
        );
      }
    }
    // Generated fields follow the module's own, so declared fields keep their
    // place in list sort and filter order.
    const resolvedFields = resolveModuleFields(
      { ...config.fields, ...generatedFields },
      config.serverFields,
    );
    const oneToOne = config.oneToOne
      ? resolveOneToOne(config.oneToOne)
      : undefined;
    const fields = oneToOne
      ? withOneToOneSelectionField(resolvedFields, oneToOne)
      : resolvedFields;
    // Erases module-specific field keys after validation so resolved modules share one registry type.
    const flatFields = fields as ServerDefinedFields;
    const afterSave: ModuleAfterSave | undefined = config.afterSave;
    assertSelectKeys(
      config.select,
      [
        "id",
        "createdAt",
        "updatedAt",
        "deletedAt",
        "parentId",
        ...Object.keys(flatFields),
      ],
      config.table,
      "admin.select",
    );
    return {
      table: config.table,
      publish,
      seo,
      revalidate: config.revalidate,
      translateError: config.translateError,
      afterSave,
      preview: config.preview,
      fields: flatFields,
      schema: createSchemaFromFields(flatFields, oneToOne),
      defaultValues: createDefaultValues(flatFields),
      oneToOne,
      select: config.select,
    };
  };

  if (isRecordTableAdmin(admin)) {
    const { table, list = {} } = admin;
    const { sort, filters, reorder, ...listOptions } = list;
    const resolvedAdmin = resolveBase(admin);
    const resolvedReorder = defineReorder(table, reorder);
    assertSelectKeys(
      listOptions.select,
      [
        "id",
        "createdAt",
        "updatedAt",
        ...Object.keys({
          ...getListSelect(table, resolvedAdmin.fields),
          ...resolveOneToOneList({ oneToOne: resolvedAdmin.oneToOne, table })
            .select,
        }),
        ...(resolvedReorder?.scope ? [resolvedReorder.scope.fieldKey] : []),
      ],
      table,
      "admin.list.select",
    );
    const listSort = defineSort(
      table,
      resolvedAdmin.fields,
      sort,
      resolvedReorder,
    );
    const listFilters = defineFilters(table, resolvedAdmin.fields, filters);
    if (resolvedAdmin.oneToOne) {
      assertDistinctListTables(resolvedAdmin.oneToOne.relations);
    }

    return {
      ...resolvedAdmin,
      create: admin.create !== false,
      list: {
        ...listOptions,
        ...(resolvedReorder?.scope
          ? {
              select: {
                ...(listOptions.select ?? {}),
                [resolvedReorder.scope.fieldKey]: resolvedReorder.scope.field,
              },
            }
          : {}),
        reorder: resolvedReorder,
        sort: {
          ...listSort,
          ...(resolvedAdmin.oneToOne
            ? defineOneToOneSort(resolvedAdmin.oneToOne.relations)
            : {}),
        },
        filters: {
          ...listFilters,
          ...(resolvedAdmin.oneToOne
            ? defineOneToOneFilters(resolvedAdmin.oneToOne.relations)
            : {}),
        },
      },
    };
  }

  return resolveBase(admin);
}

// Record tables always have a list; key tables are singleton settings.
function isRecordTableAdmin(
  admin: AdminConfigRuntime,
): admin is Extract<AdminConfigRuntime, { table: AdminTable }> {
  return "deletedAt" in admin.table;
}

function resolveModuleFields<TFields extends DefinedFields>(
  fields: TFields,
  serverFields?: ServerFields<TFields>,
) {
  return serverFields
    ? resolveServerFields(fields, {
        fields: serverFields,
      })
    : resolveServerFields(fields);
}

// Checks for a required numeric ID before a relation binding treats the table as an identity table.
function hasIdentityColumn(table: AnyPgTable): table is NumericIdTable {
  const id = getTableColumns(table).id;

  return Boolean(
    id && extractExtendedColumnType(id).type === "number" && id.notNull,
  );
}

function defineSort(
  table: AdminTable,
  fields: ServerDefinedFields,
  options: AdminSortOptions | undefined,
  reorder: ReturnType<typeof defineReorder>,
) {
  const custom = normalizeSort(table, options ?? {});
  const fieldSort = normalizeSort(table, getFieldSortOptions(fields));
  if (reorder && custom.reorder) {
    throw new Error('The "reorder" sort key is reserved for list.reorder.');
  }

  const reorderSort: AdminSort = reorder
    ? {
        reorder: {
          label: reorder.label,
          fields: reorder.scope
            ? [reorder.scope.field, reorder.field]
            : [reorder.field],
          defaultDirection: "asc",
          direction: false,
        },
      }
    : {};

  return {
    ...reorderSort,
    ...custom,
    ...Object.fromEntries(
      Object.entries(fieldSort).filter(
        ([name]) => !custom[name] && !reorderSort[name],
      ),
    ),
    ...Object.fromEntries(
      (
        [
          ["createdAt", table.createdAt, "Created"],
          ["updatedAt", table.updatedAt, "Updated"],
          ["deletedAt", table.deletedAt, "Deleted"],
        ] as const
      )
        .filter(([name]) => !custom[name] && !reorderSort[name])
        .map(([name, field, label]) => [
          name,
          {
            label,
            fields: [field],
            defaultDirection: "desc",
            direction: true,
          },
        ]),
    ),
  } satisfies AdminSort;
}

function defineReorder(
  table: AdminTable,
  options: AdminListReorderOptions | undefined,
) {
  if (!options) {
    return undefined;
  }

  const { field, fieldKey } = resolveReorderColumn(
    table,
    options === true ? "sortOrder" : (options.field ?? "sortOrder"),
  );
  const scope =
    options !== true && options.scope
      ? resolveReorderColumn(table, options.scope)
      : undefined;
  if (scope && !scope.field.notNull) {
    throw new Error(
      `Admin reorder scope column "${scope.fieldKey}" is nullable; scoped reorder requires a non-nullable column.`,
    );
  }
  if (scope && extractExtendedColumnType(scope.field).type !== "number") {
    throw new Error(
      `Admin reorder scope column "${scope.fieldKey}" has data type "${scope.field.dataType}"; scoped reorder requires a number-valued column.`,
    );
  }

  return {
    field,
    fieldKey,
    label: options === true ? "Reorder" : (options.label ?? "Reorder"),
    scope,
  };
}

function resolveReorderColumn(
  table: AdminTable,
  fieldOption: AdminFieldReference,
) {
  const columns = getTableColumns(table);
  const [fieldKey, field] =
    (typeof fieldOption === "string"
      ? ([fieldOption, columns[fieldOption]] as const)
      : Object.entries(columns).find(([, column]) => column === fieldOption)) ??
    [];

  if (!field || !fieldKey) {
    const reference =
      typeof fieldOption === "string"
        ? fieldOption
        : `${getTableName(getColumnTable(fieldOption))}.${fieldOption.name}`;
    throw new Error(
      `Admin reorder column "${reference}" does not belong to table "${getTableName(table)}".`,
    );
  }

  return { field, fieldKey };
}

function normalizeSort(table: AdminTable, options: AdminSortOptions) {
  return Object.fromEntries(
    Object.entries(options).map(([name, option]) => [
      name,
      {
        label: option.label ?? startCase(name),
        fields: option.fields.map((field) => resolveSortField(table, field)),
        defaultDirection: option.defaultDirection ?? "asc",
        direction: true,
        group: option.group,
      },
    ]),
  ) satisfies AdminSort;
}

function defineFilters(
  table: AdminTable,
  fields: ServerDefinedFields,
  options: AdminFilterOptions | undefined,
) {
  const custom = normalizeFilters(table, options ?? {});
  const fieldFilters = defineFieldFilters(table, fields);
  const visibilityFilter: AdminFilters =
    "visibility" in table && !custom.visibility && !fieldFilters.visibility
      ? {
          visibility: {
            label: "Status",
            kind: "enum",
            field: resolveFieldReference(table, "visibility"),
            options: visibilityOptions,
          },
        }
      : {};

  return {
    ...custom,
    ...Object.fromEntries(
      Object.entries(fieldFilters).filter(([name]) => !custom[name]),
    ),
    ...visibilityFilter,
    ...Object.fromEntries(
      (
        [
          ["createdAt", table.createdAt, "Created"],
          ["updatedAt", table.updatedAt, "Updated"],
          ["deletedAt", table.deletedAt, "Deleted"],
        ] as const
      )
        .filter(([name]) => !custom[name])
        .map(([name, field, label]) => [
          name,
          {
            label,
            kind: "date-range",
            field,
          },
        ]),
    ),
  } satisfies AdminFilters;
}

export function defineFieldFilters(
  table: AdminTable,
  fields: ServerDefinedFields,
) {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, field]) => field.filter === true)
      .map(([name, field]) => {
        const filter = resolveFieldFilter(field, () =>
          resolveFieldReference(table, name),
        );
        if (!filter || !filter.field) {
          throw new Error(
            `Field "${name}" is filterable but has no filter behavior.`,
          );
        }
        return [
          name,
          {
            label: field.label ?? startCase(name),
            ...filter,
            field: filter.field,
          },
        ] as const;
      }),
  );
}

function normalizeFilters(table: AdminTable, options: AdminFilterOptions) {
  return Object.fromEntries(
    Object.entries(options).map(([name, option]) => [
      name,
      {
        ...option,
        field: resolveFieldReference(table, option.field),
        label: option.label ?? startCase(name),
      },
    ]),
  ) satisfies AdminFilters;
}

function getFieldSortOptions(fields: ServerDefinedFields): AdminSortOptions {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, field]) => Boolean(field.sort))
      .map(([name, field]) => [
        name,
        {
          fields: [name],
          defaultDirection:
            typeof field.sort === "object"
              ? field.sort.defaultDirection
              : undefined,
        },
      ]),
  );
}

// Rejects list-active relations that share a table because unaliased joins cannot distinguish them.
function assertDistinctListTables(
  bindings: Record<string, AdminOneToOneBinding>,
) {
  const relatedTables = new Map<AnyPgTable, string>();

  for (const [relationName, binding] of Object.entries(bindings)) {
    const participatesInList = Object.values(binding.fields).some(
      (field) =>
        Boolean(field.list) ||
        field.searchable ||
        field.filter === true ||
        Boolean(field.sort),
    );
    if (!participatesInList) {
      continue;
    }

    const existingRelation = relatedTables.get(binding.table);
    if (existingRelation) {
      throw new Error(
        `One-to-one list relations "${existingRelation}" and "${relationName}" use the same table; related list tables must be distinct.`,
      );
    }

    relatedTables.set(binding.table, relationName);
  }
}

// Builds related-field sort definitions so the generic admin list can order by one-to-one values.
function defineOneToOneSort(bindings: Record<string, AdminOneToOneBinding>) {
  const sort: AdminSort = {};

  for (const [relationName, binding] of Object.entries(bindings)) {
    const columns = getTableColumns(binding.table);

    for (const [fieldName, field] of Object.entries(binding.fields)) {
      if (!field.sort) {
        continue;
      }

      const column = columns[fieldName];
      if (!column) {
        throw new Error(
          `Unknown one-to-one field reference "${relationName}.${fieldName}".`,
        );
      }

      sort[`${relationName}.${fieldName}`] = {
        label: oneToOneLabel(binding.title, fieldName, field.label),
        fields: [column],
        defaultDirection:
          typeof field.sort === "object"
            ? (field.sort.defaultDirection ?? "asc")
            : "asc",
        direction: true,
      };
    }
  }

  return sort;
}

// Builds related-field filters so the generic admin list can filter by one-to-one values.
function defineOneToOneFilters(bindings: Record<string, AdminOneToOneBinding>) {
  const filters: AdminFilters = {};

  for (const [relationName, binding] of Object.entries(bindings)) {
    const columns = getTableColumns(binding.table);

    for (const [fieldName, field] of Object.entries(binding.fields)) {
      if (field.filter !== true) {
        continue;
      }

      const filter = resolveFieldFilter(field, () => columns[fieldName]);
      if (!filter) {
        throw new Error(
          `Field "${relationName}.${fieldName}" is filterable but has no filter behavior.`,
        );
      }

      if (!filter.field) {
        throw new Error(
          `Unknown one-to-one field reference "${relationName}.${fieldName}".`,
        );
      }
      filters[`${relationName}.${fieldName}`] = {
        label: oneToOneLabel(binding.title, fieldName, field.label),
        ...filter,
        field: filter.field,
      };
    }
  }

  return filters;
}

function resolveFieldFilter(
  // Enum and includes filters label their choices from a field's declared
  // options, or from a checked field's two values.
  field: ServerDefinedFields[string] & {
    options?: readonly FieldInputOption[];
    checked?: FieldCheckedValue;
    unchecked?: FieldCheckedValue;
  },
  resolveDefaultField: () => AdminFilterField | undefined,
) {
  if (field.filterKind === "includes" && field.relationship) {
    return {
      field: relationshipFilterField(field.relationship),
      kind: "includes" as const,
      options: field.options ?? [],
    };
  }

  if (
    field.filterKind === "enum" &&
    typeof field.checked === "boolean" &&
    typeof field.unchecked === "boolean"
  ) {
    // A boolean checked pair filters its boolean column directly.
    return { field: resolveDefaultField(), kind: "boolean" as const };
  }

  if (field.filterKind === "enum" || field.filterKind === "includes") {
    const options = field.options?.length
      ? field.options
      : typeof field.checked === "string" && typeof field.unchecked === "string"
        ? [
            { label: startCase(field.unchecked), value: field.unchecked },
            { label: startCase(field.checked), value: field.checked },
          ]
        : undefined;
    if (!options) {
      return undefined;
    }

    return {
      field: resolveDefaultField(),
      kind: field.filterKind,
      options,
    };
  }

  if (
    field.filterKind === "text" ||
    field.filterKind === "boolean" ||
    field.filterKind === "date-range"
  ) {
    return { field: resolveDefaultField(), kind: field.filterKind };
  }

  return undefined;
}

// Qualifies related-field labels with their section title so list controls remain unambiguous.
function oneToOneLabel(
  relationLabel: string,
  fieldName: string,
  fieldLabel: string | undefined,
) {
  return `${relationLabel}: ${fieldLabel ?? startCase(fieldName)}`;
}

function resolveSortField(
  table: AdminTable,
  field: AdminSortField,
): ResolvedAdminSortField {
  if (typeof field === "string") {
    return resolveFieldReference(table, field);
  }

  if ("field" in field) {
    return {
      ...field,
      field: resolveSortFieldReference(table, field.field),
    };
  }

  return resolveSortFieldReference(table, field);
}

function resolveFieldReference(
  table: AdminTable,
  field: AdminFilterFieldReference,
) {
  if (typeof field !== "string") {
    return field;
  }

  const column = getTableColumns(table)[field];
  if (!column) {
    throw new Error(`Unknown admin table field reference "${field}".`);
  }

  return column;
}

function resolveSortFieldReference(
  table: AdminTable,
  field: AdminSortFieldReference,
) {
  if (typeof field === "string") {
    return resolveFieldReference(table, field);
  }

  return field;
}

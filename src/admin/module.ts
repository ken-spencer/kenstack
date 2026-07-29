import "server-only";

import type { ComponentType, SVGProps } from "react";
import startCase from "lodash-es/startCase";
import type { AnyColumn, InferSelectModel, SQL } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";

import type {
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
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";
import { createZodSchema } from "@kenstack/fields/createZodSchema";
import {
  resolveServerFields,
  serverFields,
  type ServerBehaviors,
  type ServerDefinedFields,
} from "@kenstack/fields/server";
import type { DefinedFields } from "@kenstack/fields/types";
import type { AdminKeyTable, AdminTable } from "@kenstack/admin/table";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import type { RevalidateTagRule } from "@kenstack/lib/revalidate";
import type { FetchError } from "@kenstack/api/fetcher";
import type { NumericIdTable } from "@kenstack/db/types";
import {
  getOneToOneFieldSets,
  type OneToOneFieldSet,
  type OneToOneFields,
  type OneToOneFieldSetsFrom,
} from "@kenstack/fields/oneToOneFieldSets";
import { visibilityOptions } from "./lib/visibility";

type SelectValue = AnyColumn | SQL | SQL.Aliased;
type SelectShape = Record<string, SelectValue>;
type AdminManagedTable = AdminTable | AdminKeyTable;

export type PreviewPath = `/${string}`;

type RelationConfig<TFields extends DefinedFields> = {
  behaviors?: ServerBehaviors<TFields>;
  table: AnyPgTable;
  title?: string;
  value?: string;
};

export type AdminOneToOneBinding = OneToOneFieldSet<ServerDefinedFields> & {
  foreignKey: NumericIdTable["id"];
  table: NumericIdTable;
  title: string;
  value: string;
};

type OneToOneRelations<TFields extends ServerDefinedFields> = {
  [
    TKey in Extract<keyof OneToOneFieldSetsFrom<TFields>, string>
  ]: RelationConfig<OneToOneFields<TFields, TKey>>;
};

type OneToOneConfig<TFields extends ServerDefinedFields> = {
  field: Extract<keyof TFields, string>;
  relations: OneToOneRelations<TFields>;
};

type OneToOneConfigRuntime = {
  field: string;
  relations: Record<string, RelationConfig<DefinedFields>>;
};

type OneToOneOptions<TFields extends ServerDefinedFields> =
  keyof OneToOneFieldSetsFrom<TFields> extends never
    ? { oneToOne?: never }
    : { oneToOne: OneToOneConfig<TFields> };

type ResolvedOneToOne = {
  field: string;
  relations: Record<string, AdminOneToOneBinding>;
};

type AdminConfigBase<
  TTable extends AdminManagedTable,
  TFields extends ServerDefinedFields,
> = {
  table: TTable;
  revalidate?: RevalidateTagRule<InferSelectModel<TTable>>[];
  fields: TFields;
  preview?: PreviewPath;
  translateError?: (error: unknown) => FetchError | undefined;
} & OneToOneOptions<TFields>;

type AdminListConfig<
  TTable extends AdminTable,
  TFields extends ServerDefinedFields,
  TListSelect extends SelectShape | undefined = undefined,
> = AdminConfigBase<TTable, TFields> & {
  list: {
    filters?: AdminFilterOptions;
    limit?: number;
    reorder?: AdminListReorderOptions;
    sort?: AdminSortOptions;
    select?: TListSelect;
  };
};

export type AnyAdminConfig = NonNullable<ReturnType<typeof resolveAdmin>>;
type AdminConfig<
  TTable extends AdminManagedTable,
  TFields extends ServerDefinedFields,
> = TTable extends AdminTable
  ? AdminListConfig<TTable, TFields, SelectShape | undefined>
  : AdminConfigBase<TTable, TFields>;

type RuntimeAdminConfig<TConfig> = Omit<TConfig, "oneToOne"> & {
  oneToOne?: OneToOneConfigRuntime;
};

type AdminConfigRuntime =
  | RuntimeAdminConfig<
      AdminListConfig<AdminTable, ServerDefinedFields, SelectShape | undefined>
    >
  | RuntimeAdminConfig<AdminConfigBase<AdminKeyTable, ServerDefinedFields>>;

type ModuleSettingsConfig<
  TTable extends AdminKeyTable = AdminKeyTable,
  TFields extends ModuleSettingsFields<TTable> = ModuleSettingsFields<TTable>,
> = {
  table: TTable;
  fields: TFields;
  cacheTag: string;
};

type ModuleSettingsRow<TTable extends AdminKeyTable> = Omit<
  InferSelectModel<TTable>,
  "id" | "key" | "createdBy" | "createdAt" | "updatedAt"
>;

type ModuleSettingsFields<TTable extends AdminKeyTable> = {
  [K in keyof ModuleSettingsRow<TTable>]: ServerDefinedFields[string] & {
    default: ModuleSettingsRow<TTable>[K];
  };
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
  admin?: AdminConfig<TTable, TFields>;
  settings?: ModuleSettingsConfig;
  parent?: ModuleParentOptions;
};

type ResolvedModule<
  TModule extends { name: string },
  TTable extends AdminManagedTable,
> = {
  name: TModule["name"];
  title: string;
  basePath: PreviewPath;
  icon: TModule extends { icon: infer TIcon } ? TIcon : undefined;
  admin: TModule extends { admin: infer TAdmin }
    ? Omit<TAdmin, keyof AnyAdminConfig> & AnyAdminConfig & { table: TTable }
    : undefined;
  settings: ResolvedModuleSettings | undefined;
  parent: ModuleParentOptions | undefined;
};

export type DefinedAdmin = Record<
  string,
  {
    name: string;
    title: string;
    basePath: PreviewPath;
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
    admin?: AnyAdminConfig;
    settings?: ResolvedModuleSettings;
    client?: AdminClientRegistry;
    parent?: ModuleParentOptions;
    navigationParent?: string;
  }
>;

export type DefinedAdminModule = DefinedAdmin[string] & {
  admin: AnyAdminConfig;
};

export function defineModule<
  const TTable extends AdminManagedTable,
  const TFields extends ServerDefinedFields,
  const TModule extends ModuleOptions<TTable, TFields>,
>(
  options: TModule & {
    admin?: AdminConfig<TTable, TFields>;
  },
) {
  const basePath = options.basePath ?? `/${options.name}`;
  const admin = resolveAdmin(
    options.admin as AdminConfigRuntime | undefined,
    basePath,
  );
  const settings = resolveSettings(options.settings);

  const resolved = {
    name: options.name,
    title: options.title ?? startCase(options.name),
    basePath,
    icon: options.icon,
    admin,
    settings,
    parent: options.parent,
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
    schema: createZodSchema(fields),
    defaultValues: createDefaultValues(fields),
  };
}

function resolveAdmin(
  admin: AdminConfigRuntime | undefined,
  basePath: PreviewPath,
) {
  if (!admin) {
    return undefined;
  }

  const resolveBase = <
    TTable extends AdminManagedTable,
    TFields extends ServerDefinedFields,
  >(
    config: RuntimeAdminConfig<AdminConfigBase<TTable, TFields>>,
  ) => {
    const fields = resolveServerFields(config.fields);
    // Erases module-specific field keys after validation so resolved modules share one registry type.
    const flatFields = fields as ServerDefinedFields;
    const preview =
      config.preview ??
      ("slug" in fields ? `${basePath}/${"${slug}"}` : undefined);

    return {
      table: config.table,
      revalidate: config.revalidate,
      translateError: config.translateError,
      preview,
      fields: flatFields,
      schema: createZodSchema(flatFields),
      defaultValues: createDefaultValues(flatFields),
      oneToOne: resolveOneToOne(flatFields, config.oneToOne),
    };
  };

  if ("list" in admin) {
    const { table, list } = admin;
    const { sort, filters, reorder, ...listOptions } = list;
    const resolvedAdmin = resolveBase(admin);
    const resolvedReorder = defineReorder(table, reorder);
    const listSort = defineSort(
      table,
      resolvedAdmin.fields,
      sort,
      resolvedReorder,
    );
    const listFilters = defineFilters(table, resolvedAdmin.fields, filters);
    if (resolvedAdmin.oneToOne) {
      const bindings = resolvedAdmin.oneToOne.relations;
      assertDistinctListTables(bindings);
      Object.assign(listSort, defineOneToOneSort(bindings));
      Object.assign(listFilters, defineOneToOneFilters(bindings));
    }

    return {
      ...resolvedAdmin,
      list: {
        ...listOptions,
        reorder: resolvedReorder,
        sort: listSort,
        filters: listFilters,
      },
    };
  }

  return resolveBase(admin);
}

// Validates one-to-one declarations and builds the bindings used by admin loaders and forms.
function resolveOneToOne(
  fields: ServerDefinedFields,
  config: OneToOneConfigRuntime | undefined,
): ResolvedOneToOne | undefined {
  if (!config) {
    return undefined;
  }

  const fieldSets = getOneToOneFieldSets(fields);
  const selectionField = fields[config.field];
  if (!selectionField) {
    throw new Error(
      `One-to-one selection field "${config.field}" is not declared in the parent fields.`,
    );
  }

  const values = new Set<string>();
  const relations: Record<string, AdminOneToOneBinding> = {};
  for (const [name, relation] of Object.entries(config.relations)) {
    const fieldSet = fieldSets[name];
    if (!fieldSet) {
      throw new Error(
        `One-to-one binding "${name}" has no matching field-set declaration.`,
      );
    }
    if (!hasIdentityColumn(relation.table)) {
      throw new Error(
        `One-to-one binding "${name}" requires a numeric related identity column "id".`,
      );
    }

    const value = relation.value ?? name;
    if (values.has(value)) {
      throw new Error(
        `One-to-one relations must use distinct selection values; "${value}" is duplicated.`,
      );
    }
    const parsedValue = selectionField.zod.safeParse(value);
    if (!parsedValue.success) {
      throw new Error(
        `One-to-one relation "${name}" value "${value}" is not accepted by selection field "${config.field}".`,
      );
    }
    if (typeof parsedValue.data !== "string" || parsedValue.data !== value) {
      throw new Error(
        `One-to-one relation "${name}" value "${value}" must remain the same string after selection-field parsing.`,
      );
    }

    values.add(value);
    relations[name] = {
      fields: serverFields(fieldSet.fields, relation.behaviors),
      defaultValues: fieldSet.defaultValues,
      table: relation.table,
      foreignKey: relation.table.id,
      title: relation.title ?? startCase(name),
      value,
    };
  }

  const parsedDefault = selectionField.zod.safeParse(selectionField.default);
  if (
    !parsedDefault.success ||
    typeof parsedDefault.data !== "string" ||
    parsedDefault.data !== selectionField.default
  ) {
    throw new Error(
      `One-to-one selection field "${config.field}" default must remain the same string after parsing.`,
    );
  }
  if (!values.has(parsedDefault.data)) {
    throw new Error(
      `One-to-one selection field "${config.field}" default must match a declared relation value.`,
    );
  }

  return {
    field: config.field,
    relations,
  };
}

// Checks for a required numeric ID before a relation binding treats the table as an identity table.
function hasIdentityColumn(table: AnyPgTable): table is NumericIdTable {
  const id = getTableColumns(table).id;

  return Boolean(id && id.dataType === "number" && id.notNull);
}

function defineSort<TTable extends AdminTable>(
  table: TTable,
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
          fields: [reorder.field],
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

  const columns = getTableColumns(table);
  let fieldKey: string | undefined;
  let field: (typeof columns)[string] | undefined;
  const fieldOption =
    options === true ? "sortOrder" : (options.field ?? "sortOrder");

  if (typeof fieldOption === "string") {
    fieldKey = fieldOption;
    field = columns[fieldKey];
  } else {
    const column = Object.entries(columns).find(
      ([, tableColumn]) => tableColumn === fieldOption,
    );
    fieldKey = column?.[0];
    field = column?.[1];
  }

  if (!field || !fieldKey) {
    throw new Error("Unknown admin table field reference.");
  }

  return {
    field,
    fieldKey,
    label: options === true ? "Reorder" : (options.label ?? "Reorder"),
  };
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

function defineFilters<TTable extends AdminTable>(
  table: TTable,
  fields: ServerDefinedFields,
  options: AdminFilterOptions | undefined,
) {
  const custom = normalizeFilters(table, options ?? {});
  const fieldFilters = defineFieldFilters(table, fields);
  const visibilityFilter: AdminFilters =
    "visibility" in table && !custom.visibility
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
  const entries: [string, AdminFilters[string]][] = [];

  Object.entries(fields)
    .filter(([, field]) => field.filter === true)
    .forEach(([name, field]) => {
      const filter = field.filterConfig;
      if (!filter) {
        throw new Error(
          `Field "${name}" is filterable but has no filter behavior.`,
        );
      }

      const { field: filterField, ...filterOptions } = filter;

      entries.push([
        name,
        {
          field: resolveFieldReference(table, filterField ?? name),
          label: field.label ?? startCase(name),
          ...filterOptions,
        },
      ]);
    });

  return Object.fromEntries(entries);
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

      const filter = field.filterConfig;
      if (!filter) {
        throw new Error(
          `Field "${relationName}.${fieldName}" is filterable but has no filter behavior.`,
        );
      }

      const { field: filterField, ...filterOptions } = filter;
      const column = filterField ?? columns[fieldName];
      if (!column) {
        throw new Error(
          `Unknown one-to-one field reference "${relationName}.${fieldName}".`,
        );
      }

      filters[`${relationName}.${fieldName}`] = {
        field: column,
        label: oneToOneLabel(binding.title, fieldName, field.label),
        ...filterOptions,
      };
    }
  }

  return filters;
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

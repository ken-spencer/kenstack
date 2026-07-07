import "server-only";

import type { ComponentType, SVGProps } from "react";
import startCase from "lodash-es/startCase";
import type { AnyColumn, InferSelectModel, SQL } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";

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
  type ServerField,
  type ServerDefinedFields,
} from "@kenstack/fields/server";
import type { AdminKeyTable, AdminTable } from "@kenstack/admin/table";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import type { RevalidateTagRule } from "@kenstack/lib/revalidate";
import { visibilityOptions } from "./lib/visibility";

type SelectValue = AnyColumn | SQL | SQL.Aliased;
type SelectShape = Record<string, SelectValue>;
type AdminManagedTable = AdminTable | AdminKeyTable;

export type PreviewPath = `/${string}`;

type AdminConfigBase<TTable extends AdminManagedTable> = {
  table: TTable;
  revalidate?: RevalidateTagRule<InferSelectModel<TTable>>[];
  fields: ServerDefinedFields;
  preview?: PreviewPath;
};

type AdminListConfig<
  TTable extends AdminTable,
  TListSelect extends SelectShape | undefined = undefined,
> = AdminConfigBase<TTable> & {
  list: {
    filters?: AdminFilterOptions;
    limit?: number;
    reorder?: AdminListReorderOptions;
    sort?: AdminSortOptions;
    select?: TListSelect;
  };
};

type AdminSingleConfig<TTable extends AdminKeyTable> = AdminConfigBase<TTable>;

export type AnyAdminConfig = NonNullable<ReturnType<typeof resolveAdmin>>;
type AdminConfig =
  | AdminListConfig<AdminTable, SelectShape | undefined>
  | AdminSingleConfig<AdminKeyTable>;

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
  [K in keyof ModuleSettingsRow<TTable>]: ServerField & {
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

type ModuleOptions = {
  name: string;
  title?: string;
  basePath?: PreviewPath;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  admin?: AdminConfig;
  settings?: ModuleSettingsConfig;
  parent?: ModuleParentOptions;
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

export function defineModule<const TModule extends ModuleOptions>(
  options: TModule,
) {
  const basePath = options.basePath ?? `/${options.name}`;

  return {
    title: options.title ?? startCase(options.name),
    ...options,
    basePath,
    admin: resolveAdmin(options.admin, basePath),
    settings: resolveSettings(options.settings),
    parent: options.parent,
  } satisfies DefinedAdmin[string];
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

function resolveAdmin(admin: AdminConfig | undefined, basePath: PreviewPath) {
  if (!admin) {
    return undefined;
  }

  const resolveBase = <TTable extends AdminManagedTable>(
    config: AdminConfigBase<TTable>,
  ) => {
    const fields = resolveServerFields(config.fields);
    const preview: PreviewPath | undefined =
      config.preview ??
      ("slug" in fields ? `${basePath}/${"${slug}"}` : undefined);

    return {
      table: config.table,
      revalidate: config.revalidate,
      preview,
      fields,
      schema: createZodSchema(fields),
      defaultValues: createDefaultValues(fields),
    };
  };

  if ("list" in admin) {
    const { table, list } = admin;
    const { sort, filters, reorder, ...listOptions } = list;
    const resolvedAdmin = resolveBase(admin);
    const resolvedReorder = defineReorder(table, reorder);

    return {
      ...resolvedAdmin,
      list: {
        ...listOptions,
        reorder: resolvedReorder,
        sort: defineSort(table, resolvedAdmin.fields, sort, resolvedReorder),
        filters: defineFilters(table, resolvedAdmin.fields, filters),
      },
    };
  }

  return resolveBase(admin);
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

  if (typeof options.field === "string") {
    fieldKey = options.field;
    field = columns[fieldKey];
  } else {
    const column = Object.entries(columns).find(
      ([, tableColumn]) => tableColumn === options.field,
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
    label: options.label ?? "Reorder",
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
      const filter = field.behavior?.filter;
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

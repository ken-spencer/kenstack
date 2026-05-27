import type { ComponentType, SVGProps } from "react";
import type * as z from "zod";
import startCase from "lodash-es/startCase";
import omit from "lodash-es/omit";
import type { AnyColumn, InferSelectModel, SQL } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";

import type {
  AdminFieldReference,
  AdminFilterOptions,
  AdminFilters,
  AdminSort,
  AdminSortField,
  AdminSortOptions,
  ResolvedAdminSortField,
} from "@kenstack/admin/types/list";
import type { AdminClient, ModuleClient } from "@kenstack/admin/client";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";
import { createZodSchema } from "@kenstack/fields/createZodSchema";
import {
  resolveServerFields,
  type ServerDefinedFields,
} from "@kenstack/fields/server";
import type { AdminKeyTable, AdminTable } from "@kenstack/admin/table";
import { visibilityOptions } from "./metadata";

type SelectValue = AnyColumn | SQL | SQL.Aliased;
export type SelectShape = Record<string, SelectValue>;
export type AdminManagedTable = AdminTable | AdminKeyTable;

type RevalidateCallback<TTable extends AdminManagedTable> = {
  bivarianceHack(row: InferSelectModel<TTable>): string;
}["bivarianceHack"];

export type PreviewPath = `/${string}`;

type AdminConfigBase<TTable extends AdminManagedTable> = {
  client: AdminClient;
  title: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  table: TTable;
  revalidate?: (string | RevalidateCallback<TTable>)[];
  fields: ServerDefinedFields;
  preview?: PreviewPath;
};

export type AdminConfig<
  TTable extends AdminTable,
  TListSelect extends SelectShape | undefined = undefined,
> = AdminConfigBase<TTable> & {
  filters?: AdminFilterOptions;
  limit?: number;
  sort?: AdminSortOptions;
  select?: TListSelect;
};

export type AdminSingleConfig<TTable extends AdminKeyTable> =
  AdminConfigBase<TTable> & {
    filters?: never;
    limit?: never;
    sort?: never;
    select?: never;
  };

export type ResolvedAdminConfig<
  TTable extends AdminTable,
  TListSelect extends SelectShape | undefined = undefined,
> = Omit<AdminConfig<TTable, TListSelect>, "sort" | "filters"> & {
  single: false;
  schema: z.ZodObject;
  defaultValues: Record<string, unknown>;
  sort: AdminSort;
  filters: AdminFilters;
};

export type ResolvedAdminSingleConfig<TTable extends AdminKeyTable> =
  AdminSingleConfig<TTable> & {
    single: true;
    schema: z.ZodObject;
    defaultValues: Record<string, unknown>;
  };

export type AnyAdminTableConfig = ResolvedAdminConfig<
  AdminTable,
  SelectShape | undefined
>;

export type AnyAdminSingleConfig = ResolvedAdminSingleConfig<AdminKeyTable>;

export type AnyAdminConfig = AnyAdminTableConfig | AnyAdminSingleConfig;

export type ModuleSettingsConfig<TTable extends AdminKeyTable = AdminKeyTable> =
  {
    table: TTable;
    fields: ServerDefinedFields;
  };

export type ResolvedModuleSettingsConfig<
  TTable extends AdminKeyTable = AdminKeyTable,
> = ModuleSettingsConfig<TTable> & {
  schema: z.ZodObject;
  defaultValues: Record<string, unknown>;
};

export type ModuleDefinition<
  TSettings extends ModuleSettingsConfig | undefined =
    | ModuleSettingsConfig
    | undefined,
  TClient extends ModuleClient | undefined = ModuleClient | undefined,
> = {
  name: string;
  title?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  client?: TClient;
  table?: AdminManagedTable;
  fields?: ServerDefinedFields;
  filters?: AdminFilterOptions;
  sort?: AdminSortOptions;
  settings?: TSettings;
};

export type DefinedModuleConfig = ModuleDefinition<
  ResolvedModuleSettingsConfig | undefined
> & {
  title: string;
  records: false;
};

export type AdminModuleConfig = Omit<DefinedModuleConfig, "records"> & {
  records: true;
} & AnyAdminConfig;

export type AdminDefinition = Record<
  string,
  DefinedModuleConfig | AdminModuleConfig
>;

export function defineModule<
  const TModule extends ModuleDefinition<
    ModuleSettingsConfig | undefined,
    ModuleClient | undefined
  >,
>(options: TModule) {
  const moduleOptions = omit(options, ["sort", "filters"]);
  let adminOptions;

  if (options.fields && options.table) {
    const fields = resolveServerFields(options.fields);

    adminOptions = {
      records: true,
      fields,
      schema: createZodSchema(fields),
      defaultValues: createDefaultValues(fields),
    };

    if ("key" in options.table) {
      adminOptions = {
        ...adminOptions,
        single: true,
      };
    } else {
      adminOptions = {
        ...adminOptions,
        single: false,
        sort: defineSort(options.table, fields, options.sort),
        filters: defineFilters(options.table, fields, options.filters),
      };
    }
  }

  let settingsOptions;

  if (options.settings) {
    const fields = resolveServerFields(options.settings.fields);
    settingsOptions = {
      settings: {
        ...options.settings,
        fields,
        schema: createZodSchema(fields),
        defaultValues: createDefaultValues(fields),
      },
    };
  }

  return {
    title: startCase(options.name),
    ...moduleOptions,
    ...adminOptions,
    ...settingsOptions,
  };
}

function defineSort<TTable extends AdminTable>(
  table: TTable,
  fields: ServerDefinedFields,
  options: AdminSortOptions | undefined,
) {
  const custom = normalizeSort(table, options ?? {});
  const fieldSort = normalizeSort(table, getFieldSortOptions(fields));

  return {
    ...custom,
    ...Object.fromEntries(
      Object.entries(fieldSort).filter(([name]) => !custom[name]),
    ),
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
            fields: [field],
            defaultDirection: "desc",
          },
        ]),
    ),
  } satisfies AdminSort;
}

function normalizeSort(table: AdminTable, options: AdminSortOptions) {
  return Object.fromEntries(
    Object.entries(options).map(([name, option]) => [
      name,
      {
        label: option.label ?? startCase(name),
        fields: option.fields.map((field) => resolveSortField(table, field)),
        defaultDirection: option.defaultDirection ?? "asc",
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
  const fieldFilters = normalizeFilters(table, getFieldFilterOptions(fields));
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

function getFieldFilterOptions(
  fields: ServerDefinedFields,
): AdminFilterOptions {
  const entries: [string, AdminFilterOptions[string]][] = [];

  Object.entries(fields)
    .filter(([, field]) => field.filter === true)
    .forEach(([name, field]) => {
      const filter = field.behavior?.filter;
      if (!filter) {
        throw new Error(
          `Field "${name}" is filterable but has no filter behavior.`,
        );
      }

      entries.push([name, { field: name, ...filter }]);
    });

  return Object.fromEntries(entries);
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
      field: resolveFieldReference(table, field.field),
    };
  }

  return field;
}

function resolveFieldReference(table: AdminTable, field: AdminFieldReference) {
  if (typeof field !== "string") {
    return field;
  }

  const column = getTableColumns(table)[field];
  if (!column) {
    throw new Error(`Unknown admin table field reference "${field}".`);
  }

  return column;
}

export function defineAdmin<const TModules extends readonly { name: string }[]>(
  modules: TModules,
): AdminDefinition {
  return Object.fromEntries(
    modules.map((module) => [module.name, module]),
  ) as AdminDefinition;
}

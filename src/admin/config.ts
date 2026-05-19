import { defineRelationships, type Relationships } from "./relationships";
import type { AdminKeyTable, AdminTable } from "./table";
import {
  createDefaultValues,
  createZodSchema,
  type DefinedFields,
} from "./fields";
import { visibilityOptions } from "./metadata";

import type { ComponentType, SVGProps } from "react";
import * as z from "zod";
import { type PipelineOptions } from "@kenstack/api";
import { type AdminClient, adminClient } from "./client";
export { type AdminClient, adminClient };
import startCase from "lodash-es/startCase";

import { type TagsTable } from "@kenstack/db/tables/tags";
import type {
  AnyColumn,
  InferInsertModel,
  InferSelectModel,
  SQL,
} from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

type SelectValue = AnyColumn | SQL | SQL.Aliased;
type SelectShape = Record<string, SelectValue>;

export type SortDirection = "asc" | "desc";

export type AdminSortField =
  | AnyColumn
  | {
      field: AnyColumn;
      direction?: SortDirection;
    };

export type AdminSortOptions = Record<
  string,
  {
    label?: string;
    fields: readonly AdminSortField[];
    defaultDirection?: SortDirection;
  }
>;

export type AdminSort = Record<
  string,
  {
    label: string;
    fields: readonly AdminSortField[];
    defaultDirection: SortDirection;
  }
>;

export type AdminSortMeta = {
  name: string;
  label: string;
  defaultDirection: SortDirection;
};

export type AdminFilterKind =
  | "date-range"
  | "boolean"
  | "enum"
  | "includes"
  | "text";

export type AdminFilterOption = readonly [
  value: string,
  label: string,
  description?: string,
];

type AdminFilterBase = {
  label?: string;
};

export type AdminFilterOptions = Record<
  string,
  | (AdminFilterBase & {
      kind: "date-range";
      field: AnyColumn;
    })
  | (AdminFilterBase & {
      kind: "boolean";
      field: AnyColumn;
    })
  | (AdminFilterBase & {
      kind: "enum" | "includes";
      field: AnyColumn;
      options: readonly AdminFilterOption[];
    })
  | (AdminFilterBase & {
      kind: "text";
      field: AnyColumn;
    })
>;

export type AdminFilters = Record<
  string,
  {
    label: string;
  } & AdminFilterOptions[string]
>;

export type AdminFilterMeta = {
  name: string;
  label: string;
  kind: AdminFilterKind;
  options?: {
    value: string;
    label: string;
    description?: string;
  }[];
};

export type ImageGalleryConfig = {
  table: AnyPgTable;
  tableIdKey: string;
  tableId: AnyPgColumn<{ data: number }>;
  imageIdKey: string;
  imageId: AnyPgColumn<{ data: number }>;
  sortOrderKey: string;
  sortOrder: AnyPgColumn<{ data: number }>;
};

type AdminManagedTable = AdminTable | AdminKeyTable;

type AdminManagedTableKeys<TTable extends AdminManagedTable> =
  keyof (TTable extends AdminKeyTable ? AdminKeyTable : AdminTable);

type AdminDefaultValues<TTable extends AdminManagedTable> = Omit<
  InferInsertModel<TTable>,
  AdminManagedTableKeys<TTable>
>;

type RevalidateCallback<TTable extends AdminManagedTable> = {
  bivarianceHack(row: InferSelectModel<TTable>): string;
}["bivarianceHack"];

export type PreviewPath = `/${string}`;

type AdminConfigBase<TTable extends AdminManagedTable> = {
  client: AdminClient;
  title: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;

  table: TTable;
  schema?: z.ZodObject;
  defaultValues?: AdminDefaultValues<TTable>;
  revalidate?: (string | RevalidateCallback<TTable>)[];

  fields: DefinedFields;

  preview?: PreviewPath;

  relationships?: Relationships;
  galleries?: Record<string, ImageGalleryConfig>;
  tags?: {
    table: TagsTable;
  };
};

export type AdminConfig<
  TTable extends AdminTable,
  TListSelect extends SelectShape | undefined = undefined,
> = AdminConfigBase<TTable> & {
  filters?: AdminFilterOptions;
  limit?: number;
  sort?: AdminSortOptions;
  select: TListSelect;
};

export type AdminSingleConfig<TTable extends AdminKeyTable> =
  AdminConfigBase<TTable> & {
    key: string;
    filters?: never;
    limit?: never;
    sort?: never;
    select?: never;
  };

export type ResolvedAdminConfig<
  TTable extends AdminTable,
  TListSelect extends SelectShape | undefined = undefined,
> = AdminConfig<TTable, TListSelect> & {
  single: false;
  schema: z.ZodObject;
  sort: AdminSort;
  sortMeta: AdminSortMeta[];
  filters: AdminFilters;
  filterMeta: AdminFilterMeta[];
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

export type AdminApiOptions<
  TAdminConfig extends AnyAdminConfig = AnyAdminTableConfig,
> = PipelineOptions & {
  adminConfig: TAdminConfig;
};

export function adminConfig<
  TTable extends AdminTable,
  TListSelect extends SelectShape | undefined = undefined,
>(
  options: AdminConfig<TTable, TListSelect>,
): ResolvedAdminConfig<TTable, TListSelect>;
export function adminConfig<TTable extends AdminKeyTable>(
  options: AdminSingleConfig<TTable>,
): ResolvedAdminSingleConfig<TTable>;
export function adminConfig(
  options: {
    table: AdminManagedTable;
    fields: DefinedFields;
    sort?: AdminSortOptions;
    filters?: AdminFilterOptions;
  } & Record<string, unknown>,
): AnyAdminConfig {
  if (!isAdminTable(options.table)) {
    return {
      ...options,
      single: true,
      schema: createZodSchema(options.fields, true),
      defaultValues: createDefaultValues(options.fields),
    } as AnyAdminSingleConfig;
  }

  const tableOptions = options as AdminConfig<
    AdminTable,
    SelectShape | undefined
  >;
  const sort = defineSort(tableOptions.table, tableOptions.sort);
  const filters = defineFilters(tableOptions.table, tableOptions.filters);

  return {
    ...tableOptions,
    single: false,
    sort,
    sortMeta: Object.entries(sort).map(([name, option]) => ({
      name,
      label: option.label,
      defaultDirection: option.defaultDirection,
    })),
    filters,
    filterMeta: Object.entries(filters).map(([name, filter]) => ({
      name,
      label: filter.label,
      kind: filter.kind,
      options:
        "options" in filter
          ? filter.options.map(([value, label, description]) => ({
              value,
              label,
              description,
            }))
          : undefined,
    })),
    schema: createZodSchema(options.fields, true),
    defaultValues: createDefaultValues(options.fields),
  } as AnyAdminTableConfig;
}

export function isAdminTableConfig(
  adminConfig: AnyAdminConfig,
): adminConfig is AnyAdminTableConfig {
  return !adminConfig.single;
}

export { defineRelationships };

function isAdminTable(table: AdminManagedTable): table is AdminTable {
  return "deletedAt" in table && "publicId" in table;
}

function defineSort<TTable extends AdminTable>(
  table: TTable,
  options: AdminSortOptions | undefined,
) {
  const custom = normalizeSort(options ?? {});

  return {
    ...custom,
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

function normalizeSort(options: AdminSortOptions) {
  return Object.fromEntries(
    Object.entries(options).map(([name, option]) => [
      name,
      {
        label: option.label ?? startCase(name),
        fields: option.fields,
        defaultDirection: option.defaultDirection ?? "asc",
      },
    ]),
  ) satisfies AdminSort;
}

function defineFilters<TTable extends AdminTable>(
  table: TTable,
  options: AdminFilterOptions | undefined,
) {
  const custom = normalizeFilters(options ?? {});
  const visibilityFilter: AdminFilters =
    "visibility" in table && !custom.visibility
      ? {
          visibility: {
            label: "Status",
            kind: "enum",
            field: table.visibility as AnyColumn,
            options: visibilityOptions,
          },
        }
      : {};

  return {
    ...custom,
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

function normalizeFilters(options: AdminFilterOptions) {
  return Object.fromEntries(
    Object.entries(options).map(([name, option]) => [
      name,
      {
        ...option,
        label: option.label ?? startCase(name),
      },
    ]),
  ) satisfies AdminFilters;
}

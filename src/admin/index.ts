export * from "./fields";
export * from "./table";
import { defineRelationships, type Relationships } from "./relationships";

import type { MetaTable } from "./table";

import {
  createDefaultValues,
  createZodSchema,
  type DefinedFields,
} from "./fields";

import type { ComponentType, SVGProps } from "react";
import * as z from "zod";
import { type PipelineOptions } from "@kenstack/lib/api";
import { type AdminClient, adminClient } from "./client";
export { type AdminClient, adminClient };
import startCase from "lodash-es/startCase";

import { type TagsTable } from "@kenstack/db/tables/tags";
import type {
  AnyColumn,
  InferSelectModel,
  SQL,
  InferInsertModel,
  // Table,
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

// type FieldProps = {
//   transformations?: Record<string, string>; // cloudinary transformations
//   accept?: string[]; // array of mime types allowd to upload
//   folder?: string; // folder to upload to
// };

type MetaKeys = keyof MetaTable;

type AdminDefaultValues<TTable extends MetaTable> = Omit<
  InferInsertModel<TTable>,
  MetaKeys
>;

export type PreviewPath = `/${string}`;

export type AdminTable<
  TTable extends MetaTable,
  TListSelect extends SelectShape | undefined = undefined,
> = {
  client: AdminClient;
  /** Human‑readable name */
  title: string;
  /** SVG icon component (e.g. Lucide icons) */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;

  table: TTable;
  schema?: z.ZodObject;
  defaultValues?: AdminDefaultValues<TTable>;
  revalidate?: (string | ((row: InferSelectModel<TTable>) => string))[];

  fields: DefinedFields;
  filters?: AdminFilterOptions;

  preview?: PreviewPath;

  limit?: number;
  sort?: AdminSortOptions;
  select: TListSelect;
  relationships?: Relationships;
  galleries?: Record<string, ImageGalleryConfig>;
  tags?: {
    table: TagsTable;
  };
};

export type AnyAdminTable = AdminTable<MetaTable, SelectShape | undefined> & {
  schema: z.ZodObject;
  sort: AdminSort;
  sortMeta: AdminSortMeta[];
  filters: AdminFilters;
  filterMeta: AdminFilterMeta[];
};

export type AdminApiOptions = PipelineOptions & {
  adminTable: AnyAdminTable;
};

export function adminTable<
  TTable extends MetaTable,
  TListSelect extends SelectShape | undefined = undefined,
>(options: AdminTable<TTable, TListSelect>) {
  const sort = defineSort(options.table, options.sort);
  const filters = defineFilters(options.table, options.filters);

  return {
    ...options,
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
  };
}

export type AdminConfig = [string, AnyAdminTable][];

export function adminConfig<TConfig extends AdminConfig>(adminConfig: TConfig) {
  return adminConfig;
}

export { defineRelationships };

function defineSort<TTable extends MetaTable>(
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

function defineFilters<TTable extends MetaTable>(
  table: TTable,
  options: AdminFilterOptions | undefined,
) {
  const custom = normalizeFilters(options ?? {});

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

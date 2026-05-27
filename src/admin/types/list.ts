import type { AnyColumn } from "drizzle-orm";

export type SortDirection = "asc" | "desc";
export type AdminFieldReference = string | AnyColumn;

export type AdminSortField =
  | AdminFieldReference
  | {
      field: AdminFieldReference;
      direction?: SortDirection;
    };

export type ResolvedAdminSortField =
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
    fields: readonly ResolvedAdminSortField[];
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
      field: AdminFieldReference;
    })
  | (AdminFilterBase & {
      kind: "boolean";
      field: AdminFieldReference;
    })
  | (AdminFilterBase & {
      kind: "enum" | "includes";
      field: AdminFieldReference;
      options: readonly AdminFilterOption[];
    })
  | (AdminFilterBase & {
      kind: "text";
      field: AdminFieldReference;
    })
>;

export type AdminFilters = Record<
  string,
  {
    label: string;
  } & (
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
  )
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

export function getSortMeta(sort: AdminSort): AdminSortMeta[] {
  return Object.entries(sort).map(([name, option]) => ({
    name,
    label: option.label,
    defaultDirection: option.defaultDirection,
  }));
}

export function getFilterMeta(filters: AdminFilters): AdminFilterMeta[] {
  return Object.entries(filters).map(([name, filter]) => ({
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
  }));
}

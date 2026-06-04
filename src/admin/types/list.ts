import type { AnyColumn, SQL } from "drizzle-orm";

export type SortDirection = "asc" | "desc";
export type AdminFieldReference = string | AnyColumn;
export type AdminSortFieldReference = AdminFieldReference | SQL;

export type AdminSortField =
  | AdminSortFieldReference
  | {
      field: AdminSortFieldReference;
      direction?: SortDirection;
    };

export type ResolvedAdminSortField =
  | AnyColumn
  | SQL
  | {
      field: AnyColumn | SQL;
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

export type AdminFilterOption = {
  description?: string;
  label: string;
  value: string;
};

export type AdminFilterOptions = Record<
  string,
  | {
      label?: string;
      kind: "date-range";
      field: AdminFieldReference;
    }
  | {
      label?: string;
      kind: "boolean";
      field: AdminFieldReference;
    }
  | {
      label?: string;
      kind: "enum" | "includes";
      field: AdminFieldReference;
      options: readonly AdminFilterOption[];
    }
  | {
      label?: string;
      kind: "text";
      field: AdminFieldReference;
    }
>;

export type AdminFilters = Record<
  string,
  {
    label: string;
  } & (
    | {
        kind: "date-range";
        field: AnyColumn;
      }
    | {
        kind: "boolean";
        field: AnyColumn;
      }
    | {
        kind: "enum" | "includes";
        field: AnyColumn;
        options: readonly AdminFilterOption[];
      }
    | {
        kind: "text";
        field: AnyColumn;
      }
  )
>;

export type AdminFilterMeta = {
  name: string;
  label: string;
  kind: AdminFilterKind;
  options?: AdminFilterOption[];
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
        ? filter.options.map(({ description, label, value }) => ({
            description,
            label,
            value,
          }))
        : undefined,
  }));
}

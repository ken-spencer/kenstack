import type { AnyColumn, SQL } from "drizzle-orm";

export type SortDirection = "asc" | "desc";
export type AdminFieldReference = string | AnyColumn;
export type AdminFilterField = AnyColumn | SQL;
export type AdminFilterFieldReference = AdminFieldReference | SQL;
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
    direction: boolean;
  }
>;

export type AdminSortMeta = {
  name: string;
  label: string;
  defaultDirection: SortDirection;
  direction: boolean;
};

export type AdminListReorderOptions = {
  field: AdminFieldReference;
  label?: string;
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
      field: AdminFilterFieldReference;
    }
  | {
      label?: string;
      kind: "boolean";
      field: AdminFilterFieldReference;
    }
  | {
      label?: string;
      kind: "enum" | "includes";
      field: AdminFilterFieldReference;
      options: readonly AdminFilterOption[];
    }
  | {
      label?: string;
      kind: "text";
      field: AdminFilterFieldReference;
    }
>;

export type AdminFilters = Record<
  string,
  {
    label: string;
  } & (
    | {
        kind: "date-range";
        field: AdminFilterField;
      }
    | {
        kind: "boolean";
        field: AdminFilterField;
      }
    | {
        kind: "enum" | "includes";
        field: AdminFilterField;
        options: readonly AdminFilterOption[];
      }
    | {
        kind: "text";
        field: AdminFilterField;
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
    direction: option.direction,
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

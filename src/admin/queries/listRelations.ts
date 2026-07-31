import { and, eq, getTableColumns, type SQL } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

import type { AnyAdminConfig } from "@kenstack/admin/module";

export type ListJoin = {
  on: SQL;
  table: AnyPgTable;
};

// Builds one-to-one joins and field metadata so related fields participate in parent list queries.
export function resolveOneToOneList(
  adminConfig: Pick<AnyAdminConfig, "oneToOne" | "table">,
) {
  const oneToOne = adminConfig.oneToOne;
  if (!oneToOne) {
    return {
      joins: [],
      searchable: [],
      select: {},
    };
  }

  const parentColumns = getTableColumns(adminConfig.table);
  const parentId = parentColumns.id;
  const selectionColumn = parentColumns[oneToOne.field];
  const select: Record<string, AnyPgColumn | SQL> = {};
  const searchable: (AnyPgColumn | SQL)[] = [];
  const joins: ListJoin[] = [];

  for (const [relationName, binding] of Object.entries(oneToOne.relations)) {
    const relatedColumns = getTableColumns(binding.table);
    const activeFields = Object.entries(binding.fields).filter(
      ([, field]) =>
        Boolean(field.list) ||
        field.searchable ||
        field.filter === true ||
        Boolean(field.sort),
    );

    if (!activeFields.length) {
      continue;
    }

    joins.push({
      table: binding.table,
      on: and(
        eq(binding.foreignKey, parentId),
        eq(selectionColumn, binding.value),
      )!,
    });

    for (const [fieldName, field] of activeFields) {
      const column = relatedColumns[fieldName];
      const selected = field.listSelect?.({
        key: fieldName,
        field,
        column,
        columns: relatedColumns,
      });
      const value = selected ?? column;

      if (field.list && value) {
        select[`${relationName}.${fieldName}`] = value;
      }
      if (field.searchable && value) {
        searchable.push(value);
      }
    }
  }

  return { joins, searchable, select };
}

type LeftJoinQuery<TQuery> = {
  leftJoin(table: AnyPgTable, on: SQL): TQuery;
};

// Applies the resolved joins so list rows, counts, and neighbor queries share the same relation
// scope.
export function applyListJoins<TQuery extends LeftJoinQuery<TQuery>>(
  query: TQuery,
  joins: readonly ListJoin[],
): TQuery {
  if (!joins.length) {
    return query;
  }

  let joined = query;
  for (const join of joins) {
    joined = joined.leftJoin(join.table, join.on);
  }

  return joined;
}

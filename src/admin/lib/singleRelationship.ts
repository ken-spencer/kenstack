import "server-only";

import { asc, desc, getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

import {
  isAdminListModule,
  type DefinedAdmin,
  type DefinedAdminModule,
} from "@kenstack/admin/module";
import {
  getAdminRecordTitleSelect,
  getAdminRecordTitleSql,
} from "@kenstack/admin/lib/recordTitle";
import { isSingleRelationshipField } from "@kenstack/fields/relationship";
import { resolveListSortFields } from "@kenstack/list/server";

type AdminModule = DefinedAdmin[string];

export function resolveSingleRelationship(
  moduleConfig: DefinedAdminModule,
  modules: readonly AdminModule[],
  fieldName: string,
) {
  const field = moduleConfig.admin.fields[fieldName];
  if (!isSingleRelationshipField(field)) {
    throw new Error(
      `Field "${moduleConfig.name}.${fieldName}" is not a single relationship.`,
    );
  }
  if (field.save) {
    throw new Error(
      `Single relationship "${moduleConfig.name}.${fieldName}" requires direct table-column persistence.`,
    );
  }

  const sourceColumn = getTableColumns(moduleConfig.admin.table)[fieldName];
  if (!sourceColumn) {
    throw new Error(
      `Single relationship "${moduleConfig.name}.${fieldName}" must map to a column on table "${getTableName(moduleConfig.admin.table)}".`,
    );
  }

  const references = getTableConfig(
    moduleConfig.admin.table,
  ).foreignKeys.filter((foreignKey) => {
    const reference = foreignKey.reference();

    return (
      reference.columns.length === 1 &&
      reference.columns[0] === sourceColumn &&
      reference.foreignColumns.length === 1
    );
  });
  if (references.length !== 1) {
    throw new Error(
      `Single relationship "${moduleConfig.name}.${fieldName}" has ${references.length} matching single-column foreign keys; define exactly one.`,
    );
  }

  const reference = references[0].reference();
  const candidates = modules
    .filter(isAdminListModule)
    .filter(({ admin }) => admin.table === reference.foreignTable);
  if (candidates.length !== 1) {
    throw new Error(
      `Single relationship "${moduleConfig.name}.${fieldName}" references table "${getTableName(reference.foreignTable)}", which has ${candidates.length} registered list modules; register exactly one.`,
    );
  }

  const target = candidates[0];
  const primaryKey = reference.foreignColumns[0];
  if (primaryKey !== target.admin.table.id) {
    throw new Error(
      `Single relationship "${moduleConfig.name}.${fieldName}" references "${target.name}.${primaryKey.name}"; reference "${target.name}.id".`,
    );
  }

  const columns = getTableColumns(target.admin.table);
  const search = Object.values(getAdminRecordTitleSelect(columns));
  const firstSort = Object.values(target.admin.list.sort)[0];
  const orderBy = firstSort
    ? resolveListSortFields(
        target.admin.table,
        firstSort,
        firstSort.defaultDirection,
      ).map(({ direction, field }) =>
        direction === "desc" ? desc(field) : asc(field),
      )
    : [asc(primaryKey)];

  return {
    label: getAdminRecordTitleSql(columns, primaryKey, target.title),
    orderBy,
    primaryKey,
    search,
    table: target.admin.table,
  };
}

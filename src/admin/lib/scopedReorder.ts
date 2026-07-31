import "server-only";

import {
  getTableColumns,
  getTableName,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import {
  getTableConfig,
  type AnyPgColumn,
  type AnyPgTable,
} from "drizzle-orm/pg-core";

import {
  isAdminListModule,
  type DefinedAdmin,
  type DefinedAdminListModule,
  type DefinedAdminModule,
} from "@kenstack/admin/module";
import type { AdminTable } from "@kenstack/admin/table";
import { getAdminRecordTitleSelect } from "@kenstack/admin/lib/recordTitle";
import {
  resolveOneToOneList,
  type ListJoin,
} from "@kenstack/admin/queries/listRelations";
import type { AdminSort } from "@kenstack/admin/types/list";
import { resolveListSortFields } from "@kenstack/list/server";

type AdminModule = DefinedAdmin[string];

export function resolveReorderScopeField(moduleConfig: DefinedAdminModule) {
  const { admin, name, parent } = moduleConfig;
  if (!("list" in admin) || !admin.list.reorder) {
    return undefined;
  }
  if (admin.list.reorder.scope) {
    return admin.list.reorder.scope.field;
  }
  if (!parent) {
    return undefined;
  }

  const field = getTableColumns(admin.table)[parent.foreignKey];
  if (!field) {
    throw new Error(
      `Admin child module "${name}" parent foreign key "${parent.foreignKey}" is not a column on table "${getTableName(admin.table)}"; choose a column from that table.`,
    );
  }

  return field;
}

export function resolveScopedReorders(modules: readonly AdminModule[]) {
  const resolved = new Map<string, AdminModule>();
  const resolving = new Set<string>();

  function resolveModule(
    moduleConfig: DefinedAdminListModule,
  ): DefinedAdminListModule;
  function resolveModule(moduleConfig: AdminModule): AdminModule;
  function resolveModule(moduleConfig: AdminModule): AdminModule {
    const existing = resolved.get(moduleConfig.name);
    if (existing) {
      return existing;
    }
    if (resolving.has(moduleConfig.name)) {
      throw new Error(
        `Scoped admin reorder relationships form a cycle at module "${moduleConfig.name}".`,
      );
    }

    if (!isAdminListModule(moduleConfig)) {
      resolved.set(moduleConfig.name, moduleConfig);
      return moduleConfig;
    }
    const { admin } = moduleConfig;
    const reorder = admin.list.reorder;
    const scope = reorder?.scope;
    if (moduleConfig.parent && scope) {
      throw new Error(
        `Can't scope reorder on child module "${moduleConfig.name}"; it is already scoped by its parent.`,
      );
    }
    if (moduleConfig.parent && reorder) {
      resolveReorderScopeField(moduleConfig);
    }
    if (!reorder || !scope) {
      resolved.set(moduleConfig.name, moduleConfig);
      return moduleConfig;
    }

    resolving.add(moduleConfig.name);
    const references = getTableConfig(admin.table).foreignKeys.filter(
      (foreignKey) => {
        const reference = foreignKey.reference();

        return (
          reference.columns.length === 1 &&
          reference.columns[0] === scope.field &&
          reference.foreignColumns.length === 1
        );
      },
    );
    if (references.length !== 1) {
      throw new Error(
        `Admin reorder scope field "${moduleConfig.name}.${scope.fieldKey}" has ${references.length} matching single-column foreign keys; define exactly one.`,
      );
    }

    const reference = references[0].reference();
    const relatedCandidates = modules
      .filter(isAdminListModule)
      .filter(({ admin }) => admin.table === reference.foreignTable);
    if (relatedCandidates.length !== 1) {
      throw new Error(
        `Admin reorder scope field "${moduleConfig.name}.${scope.fieldKey}" references table "${getTableName(reference.foreignTable)}", which has ${relatedCandidates.length} registered list modules; register exactly one.`,
      );
    }

    const relatedModule = resolveModule(relatedCandidates[0]);
    const relatedAdmin = relatedModule.admin;
    const relatedColumn = reference.foreignColumns[0];
    if (relatedColumn !== relatedAdmin.table.id) {
      throw new Error(
        `Admin reorder scope field "${moduleConfig.name}.${scope.fieldKey}" references "${relatedModule.name}.${relatedColumn.name}"; reference "${relatedModule.name}.id".`,
      );
    }

    const relatedSort = Object.values(relatedAdmin.list.sort)[0];
    const labelKey =
      scope.fieldKey.endsWith("Id") && scope.fieldKey.length > 2
        ? scope.fieldKey.slice(0, -2)
        : `${scope.fieldKey}Label`;
    const relatedJoins = resolveOneToOneList(relatedAdmin).joins;
    const resolvedModule = {
      ...moduleConfig,
      admin: {
        ...admin,
        list: {
          ...admin.list,
          select: {
            [labelKey]: relatedRecordTitle(
              scope.field,
              reference.foreignTable,
              relatedColumn,
              relatedModule.title,
            ),
            ...(admin.list.select ?? {}),
          },
          sort: {
            ...admin.list.sort,
            reorder: {
              ...admin.list.sort.reorder,
              fields: [
                ...relatedOrderFields(
                  scope.field,
                  relatedAdmin.table,
                  relatedColumn,
                  relatedSort,
                  relatedJoins,
                ),
                reorder.field,
              ],
              group: {
                by: scope.fieldKey,
                label: labelKey,
                link: relatedModule.name,
              },
            },
          },
        },
      },
    };

    resolving.delete(moduleConfig.name);
    resolved.set(moduleConfig.name, resolvedModule);
    return resolvedModule;
  }

  return modules.map(resolveModule);
}

function relatedRecordTitle(
  sourceColumn: AnyPgColumn,
  relatedTable: AnyPgTable,
  relatedColumn: AnyPgColumn,
  moduleTitle: string,
) {
  const titleColumns = Object.values(
    getAdminRecordTitleSelect(getTableColumns(relatedTable)),
  );
  const fallback = sql`concat(cast(${moduleTitle + " #"} as text), ${relatedColumn})`;
  const title = titleColumns.length
    ? sql`coalesce(${sql.join(
        titleColumns.map(
          (column) => sql`nullif(btrim(cast(${column} as text)), '')`,
        ),
        sql`, `,
      )}, ${fallback})`
    : fallback;

  return relatedValue(sourceColumn, relatedTable, relatedColumn, title);
}

function relatedOrderFields(
  sourceColumn: AnyPgColumn,
  relatedTable: AdminTable,
  relatedColumn: AnyPgColumn,
  sort: AdminSort[string],
  joins: readonly ListJoin[],
) {
  return resolveListSortFields(relatedTable, sort, sort.defaultDirection).map(
    ({ field, direction }) => ({
      field:
        field === relatedColumn
          ? sourceColumn
          : relatedValue(
              sourceColumn,
              relatedTable,
              relatedColumn,
              field,
              joins,
            ),
      direction,
    }),
  );
}

function relatedValue(
  sourceColumn: AnyPgColumn,
  relatedTable: AnyPgTable,
  relatedColumn: AnyPgColumn,
  value: AnyColumn | SQL,
  joins: readonly ListJoin[] = [],
) {
  return sql`(
    select ${value}
    from ${relatedTable}
    ${sql.join(
      joins.map(({ on, table }) => sql`left join ${table} on ${on}`),
      sql` `,
    )}
    where ${relatedColumn} = ${sourceColumn}
  )`;
}

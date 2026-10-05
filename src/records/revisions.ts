import { getTableColumns, getTableName, sql } from "drizzle-orm";
import pick from "lodash-es/pick";
import type { DefinedFields } from "@kenstack/admin/fields";
import { revisions } from "@kenstack/db/tables/revisions";
import type { DbTransaction, NumericIdTable } from "@kenstack/db/types";
import { isRecord } from "@kenstack/lib/isRecord";

export type RevisionRelations = Record<string, { fields: DefinedFields }>;

export const filterRevisionSnapshot = (
  snapshot: Record<string, unknown>,
  fields: DefinedFields,
  relations: RevisionRelations = {},
) => {
  const filtered = pick(
    snapshot,
    Object.entries(fields)
      .filter(([, field]) => field.revisions)
      .map(([key]) => key),
  );

  for (const [name, relation] of Object.entries(relations)) {
    const value = snapshot[name];
    if (isRecord(value)) {
      filtered[name] = filterRevisionSnapshot(value, relation.fields);
    }
  }

  return filtered;
};

// Records a write to a row, in the transaction that made it. The revision is stamped with the row's
// `updated_at`, so it carries the write's final token even when a field handler updated the row again,
// and returns that token. A stale editor's save reads these revisions to merge or refuse.
export async function insertRevision(
  tx: DbTransaction,
  {
    changes,
    createdBy,
    rowId,
    snapshot,
    table,
  }: {
    changes: string[];
    createdBy: number;
    rowId: number;
    snapshot: Record<string, unknown>;
    table: NumericIdTable;
  },
) {
  const columns = getTableColumns(table);
  const [revision] = await tx
    .insert(revisions)
    .values({
      table: getTableName(table),
      rowId,
      createdBy,
      changes,
      snapshot,
      ...("updatedAt" in columns
        ? {
            createdAt: sql`(select ${columns.updatedAt} from ${table} where ${table.id} = ${rowId})`,
          }
        : {}),
    })
    .returning({ createdAt: revisions.createdAt });

  return revision.createdAt;
}

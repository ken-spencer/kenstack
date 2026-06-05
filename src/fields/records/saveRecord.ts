import { deps } from "@app/deps";
import { filterRevisionSnapshot } from "./revisions";
import type { AdminKeyTable, AdminTable } from "@kenstack/admin/table";
import { selectFields } from "@kenstack/fields/select";
import type {
  FieldAfterSave,
  ServerDefinedFields,
} from "@kenstack/fields/server";
import { revisions } from "@kenstack/db/tables/revisions";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import type { User } from "@kenstack/types";
import {
  revalidator,
  type RevalidateTagRule,
} from "@kenstack/lib/revalidate";
import {
  eq,
  getTableColumns,
  getTableName,
  type InferInsertModel,
  type InferSelectModel,
} from "drizzle-orm";

type TransactionDb = Parameters<
  Parameters<(typeof deps)["db"]["transaction"]>[0]
>[0];

type SaveRecordTable = AdminTable | AdminKeyTable;

type SaveRecordOptions<TTable extends SaveRecordTable> = {
  actionPrefix: string;
  table: TTable;
  fields: ServerDefinedFields;
  values: Record<string, unknown>;
  changes?: string[];
  id?: number | null;
  revalidate?: RevalidateTagRule<InferSelectModel<TTable>>[];
  query?: (ctx: {
    tx: TransactionDb;
    data: Record<string, unknown>;
    select: ReturnType<typeof selectFields<TTable, ServerDefinedFields>>;
    user: User;
  }) => Promise<{ id: number } | undefined>;
};

export async function saveRecord<TTable extends SaveRecordTable>(
  options: SaveRecordOptions<TTable>,
) {
  const { actionPrefix, table, fields, values, changes, id, revalidate } =
    options;
  const action = actionPrefix + "-" + (id ? "update" : "insert");
  const revisionChanges = changes ?? Object.keys(values);
  const user = await deps.auth.requireUser();

  if (changes && changes.length === 0) {
    return {
      status: "success" as const,
      ...(id ? { row: { id } } : {}),
      values,
    };
  }

  const changedFields = changes ? new Set(changes) : undefined;
  const shouldSaveField = (key: string) =>
    !changedFields || changedFields.has(key);
  const data: Record<string, unknown> = {};
  const handledValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (!shouldSaveField(key)) {
      continue;
    }

    if (fields[key]?.behavior?.save) {
      handledValues[key] = value;
    } else {
      data[key] = value;
    }
  }

  const tableName = getTableName(table);

  try {
    const result = await deps.db.transaction(async (tx) => {
      const preSave = await preSaveFields({
        fields,
        columns: getTableColumns(table),
        data,
        id,
        user,
        table,
        tx,
        values,
        shouldSaveField,
      });

      if (preSave.status === "error") {
        return {
          status: "error" as const,
          error: preSave.message,
        };
      }

      const select = selectFields(table, fields);
      let savedRow: { id: number } | undefined;

      if (options.query) {
        savedRow = await options.query({
          tx,
          data,
          select,
          user,
        });
      } else if (id) {
        const updateData = {
          ...data,
          updatedAt: new Date(),
        };

        const [row] = await tx
          .update(table)
          .set(updateData)
          .where(eq(table.id, id))
          .returning(select);

        savedRow = row;
      } else {
        const [row] = await tx
          .insert(table)
          .values({
            ...data,
            createdBy: user.id,
          } as InferInsertModel<TTable>)
          .returning(select);

        savedRow = row;
      }

      if (!savedRow) {
        return {
          status: "error" as const,
          error: "Unable to save this record.",
        };
      }
      const savedValues: Record<string, unknown> = { ...savedRow };

      if (preSave.afterSave.length) {
        await Promise.all(preSave.afterSave.map((afterSave) => afterSave(tx)));
      }

      for (const [fieldKey, value] of Object.entries(handledValues)) {
        const behavior = fields[fieldKey]?.behavior;
        if (!behavior?.save) {
          continue;
        }

        savedValues[fieldKey] = await behavior.save({
          db: tx,
          key: fieldKey,
          tableId: savedRow.id,
          value,
          values,
          user,
        });
      }

      await tx.insert(revisions).values({
        table: tableName,
        rowId: savedRow.id,
        createdBy: user.id,
        changes: revisionChanges,
        snapshot: filterRevisionSnapshot(savedValues, fields),
      });

      return {
        status: "success" as const,
        row: savedRow,
        values: savedValues,
      };
    });

    if (result.status !== "success") {
      return result;
    }

    await deps.logger.audit({
      action,
      table: tableName,
      rowId: result.row?.id,
      data: { changes: revisionChanges },
    });

    revalidator(
      revalidate,
      result.row as InferSelectModel<typeof table> | undefined,
    );

    return result;
  } catch (err) {
    const error = errorTranslator(err);
    if (error) {
      return {
        status: "error" as const,
        error: {
          message: error.message ?? "We couldn't complete your request.",
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
      };
    }
    throw err;
  }
}

async function preSaveFields<TTable extends SaveRecordTable>({
  fields,
  columns,
  data,
  id,
  user,
  table,
  tx,
  values,
  shouldSaveField,
}: {
  fields: ServerDefinedFields;
  columns: ReturnType<typeof getTableColumns<TTable>>;
  data: Record<string, unknown>;
  id?: number | null;
  user: User;
  table: TTable;
  tx: TransactionDb;
  values: Record<string, unknown>;
  shouldSaveField: (key: string) => boolean;
}) {
  const afterSave: FieldAfterSave[] = [];

  for (const [key, value] of Object.entries(data)) {
    const field = fields[key];
    if (!field) {
      continue;
    }

    const column = columns[key];
    if (!column && !field.behavior?.save && !field.behavior?.preSave) {
      return {
        status: "error" as const,
        message: `Field "${key}" cannot be saved without field save behavior.`,
      };
    }

    if (!field.behavior?.preSave) {
      continue;
    }

    const result = await field.behavior.preSave({
      db: tx,
      key,
      column,
      value,
      values,
      id,
      user,
      table,
      shouldSaveField,
    });

    if (result.status === "error") {
      return result;
    }

    if (result.remove) {
      delete data[key];
    } else if ("value" in result) {
      data[key] = result.value;
    }

    afterSave.push(...(result.afterSave ?? []));
  }

  return { status: "success" as const, afterSave };
}

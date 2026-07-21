import { deps } from "@app/deps";
import { filterRevisionSnapshot } from "./revisions";
import type { AdminKeyTable, AdminTable } from "@kenstack/admin/table";
import { selectFields } from "@kenstack/fields/select";
import type {
  FieldAfterSave,
  FieldSaveTask,
  ServerDefinedFields,
} from "@kenstack/fields/server";
import { revisions } from "@kenstack/db/tables/revisions";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import type { User } from "@kenstack/types";
import { revalidator, type RevalidateTagRule } from "@kenstack/lib/revalidate";
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
type SavedRow = { id: number } & Record<string, unknown>;

type SaveRecordOptions<TTable extends SaveRecordTable> = {
  actionPrefix: string;
  admin?: boolean;
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
  }) => Promise<SavedRow | undefined>;
  afterSaveRecord?: (ctx: {
    tx: TransactionDb;
    row: SavedRow;
    values: Record<string, unknown>;
    savedValues: Record<string, unknown>;
    user: User;
  }) => Promise<void>;
};

export async function saveRecord<TTable extends SaveRecordTable>(
  options: SaveRecordOptions<TTable>,
) {
  const {
    actionPrefix,
    admin = false,
    table,
    fields,
    values,
    changes,
    id,
    revalidate,
  } = options;
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
  const tableName = getTableName(table);
  let afterFailure: FieldSaveTask[] = [];
  let committed = false;

  try {
    const preparation = await prepareSaveFields({
      admin,
      fields,
      columns: getTableColumns(table),
      id,
      shouldSaveField,
      table,
      user,
      values,
    });
    afterFailure = preparation.afterFailure;

    if (preparation.status === "error") {
      await runSaveTasks(afterFailure);
      return { status: "error" as const, error: preparation.message };
    }

    const preparedValues = preparation.values;
    const data: Record<string, unknown> = {};
    const handledValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(preparedValues)) {
      if (!shouldSaveField(key)) {
        continue;
      }

      if (fields[key]?.save) {
        handledValues[key] = value;
      } else {
        data[key] = value;
      }
    }

    const result = await deps.db.transaction(async (tx) => {
      const preSave = await preSaveFields({
        admin,
        fields,
        columns: getTableColumns(table),
        data,
        handledValues,
        id,
        user,
        table,
        tx,
        values: preparedValues,
        shouldSaveField,
      });

      if (preSave.status === "error") {
        return {
          status: "error" as const,
          error: preSave.message,
        };
      }

      const select = selectFields(table, fields);
      let savedRow: SavedRow | undefined;

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

        const [row] = (await tx
          .update(table)
          .set(updateData)
          .where(eq(table.id, id))
          .returning(select)) as SavedRow[];

        savedRow = row;
      } else {
        const [row] = (await tx
          .insert(table)
          .values({
            ...data,
            createdBy: user.id,
          } as InferInsertModel<TTable>)
          .returning(select)) as SavedRow[];

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
        const field = fields[fieldKey];
        if (!field?.save) {
          continue;
        }

        savedValues[fieldKey] = await field.save({
          admin,
          db: tx,
          key: fieldKey,
          tableId: savedRow.id,
          value,
          values: preparedValues,
          user,
        });
      }

      if (preparation.afterSave.length) {
        await Promise.all(
          preparation.afterSave.map((afterSave) => afterSave(tx)),
        );
      }

      Object.assign(savedValues, preparation.savedValues);

      await options.afterSaveRecord?.({
        tx,
        row: savedRow,
        values: preparedValues,
        savedValues,
        user,
      });

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
      await runSaveTasks(afterFailure);
      return result;
    }
    committed = true;

    await runSaveTasks(preparation.afterCommit);

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
    if (!committed) {
      await runSaveTasks(afterFailure);
    }

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

async function prepareSaveFields<TTable extends SaveRecordTable>({
  admin,
  fields,
  columns,
  id,
  shouldSaveField,
  table,
  user,
  values,
}: {
  admin: boolean;
  fields: ServerDefinedFields;
  columns: ReturnType<typeof getTableColumns<TTable>>;
  id?: number | null;
  shouldSaveField: (key: string) => boolean;
  table: TTable;
  user: User;
  values: Record<string, unknown>;
}) {
  const preparedValues = { ...values };
  const afterSave: FieldAfterSave[] = [];
  const afterCommit: FieldSaveTask[] = [];
  const afterFailure: FieldSaveTask[] = [];
  const savedValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    const field = fields[key];
    if (!shouldSaveField(key) || !field?.prepareSave) {
      continue;
    }

    let result;
    try {
      result = await field.prepareSave({
        admin,
        db: deps.db,
        key,
        column: columns[key],
        value,
        values: preparedValues,
        id,
        user,
        table,
        shouldSaveField,
      });
    } catch (error) {
      await runSaveTasks(afterFailure);
      throw error;
    }

    if (result.status === "error") {
      return {
        status: "error" as const,
        message: result.message,
        afterFailure,
      };
    }

    if ("value" in result) {
      preparedValues[key] = result.value;
    }
    if ("savedValue" in result) {
      savedValues[key] = result.savedValue;
    }

    afterSave.push(...(result.afterSave ?? []));
    afterCommit.push(...(result.afterCommit ?? []));
    afterFailure.push(...(result.afterFailure ?? []));
  }

  return {
    status: "success" as const,
    values: preparedValues,
    afterSave,
    afterCommit,
    afterFailure,
    savedValues,
  };
}

async function runSaveTasks(tasks: FieldSaveTask[]) {
  await Promise.allSettled(tasks.map((task) => task()));
}

async function preSaveFields<TTable extends SaveRecordTable>({
  admin,
  fields,
  columns,
  data,
  handledValues,
  id,
  user,
  table,
  tx,
  values,
  shouldSaveField,
}: {
  admin: boolean;
  fields: ServerDefinedFields;
  columns: ReturnType<typeof getTableColumns<TTable>>;
  data: Record<string, unknown>;
  handledValues: Record<string, unknown>;
  id?: number | null;
  user: User;
  table: TTable;
  tx: TransactionDb;
  values: Record<string, unknown>;
  shouldSaveField: (key: string) => boolean;
}) {
  const afterSave: FieldAfterSave[] = [];

  for (const [key] of Object.entries(values)) {
    if (!shouldSaveField(key)) {
      continue;
    }

    const field = fields[key];
    if (!field) {
      continue;
    }

    const column = columns[key];
    if (!column && !field.save && !field.preSave) {
      return {
        status: "error" as const,
        message: `Field "${key}" cannot be saved without field save behavior.`,
      };
    }

    if (!field.preSave) {
      continue;
    }

    const hasFieldSave = Boolean(field.save);
    const value = hasFieldSave ? handledValues[key] : data[key];
    const result = await field.preSave({
      admin,
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
      delete handledValues[key];
    } else if ("value" in result) {
      if (hasFieldSave) {
        handledValues[key] = result.value;
      } else {
        data[key] = result.value;
      }
    }

    afterSave.push(...(result.afterSave ?? []));
  }

  return { status: "success" as const, afterSave };
}

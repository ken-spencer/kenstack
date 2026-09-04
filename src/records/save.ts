import "server-only";

import { db } from "@app/db";
import { requireUser } from "@kenstack/auth/server/user";
import { audit } from "@kenstack/logger";
import type { DbTransaction, NumericIdTable } from "@kenstack/db/types";
import { filterRevisionSnapshot, type RevisionRelations } from "./revisions";
import { selectFields } from "./select";
import type { FieldAfterSave, FieldSaveTask } from "@kenstack/fields/server";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";
import { revisions } from "@kenstack/db/tables/revisions";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import type { User } from "@kenstack/types";
import { revalidator, type RevalidateTagRule } from "@kenstack/lib/revalidate";
import type { FetchError } from "@kenstack/api/fetcher";
import {
  and,
  eq,
  getTableColumns,
  getTableName,
  isNull,
  type InferInsertModel,
} from "drizzle-orm";
import type { SelectedFieldValues } from "./select";

export type SavedRow = { id: number } & Record<string, unknown>;
export type RecordPreparation = Exclude<
  Awaited<ReturnType<typeof prepareRecordFields>>,
  { status: "error" }
>;
type SaveRecordOptions<
  TTable extends NumericIdTable,
  TFields extends ServerDefinedFields,
> = {
  actionPrefix: string;
  revisionChanges?: string[];
  revisionRelations?: RevisionRelations;
  admin?: boolean;
  table: TTable;
  fields: TFields;
  values: Record<string, unknown>;
  changes?: string[];
  id?: number | null;
  revalidate?: RevalidateTagRule<SelectedFieldValues<TTable, TFields>>[];
  query?: (ctx: {
    tx: DbTransaction;
    data: Record<string, unknown>;
    select: ReturnType<typeof selectFields<TTable, TFields>>;
    user: User;
  }) => Promise<SelectedFieldValues<TTable, TFields> | undefined>;
  afterSave?: (ctx: {
    tx: DbTransaction;
    row: SelectedFieldValues<TTable, TFields>;
    values: Record<string, unknown>;
    savedValues: Record<string, unknown>;
    user: User;
  }) => Promise<{
    revisionValues: Record<string, unknown>;
  } | void>;
  additionalPreparations?: RecordPreparation[];
  translateError?: (error: unknown) => FetchError | undefined;
};

export async function saveRecord<
  TTable extends NumericIdTable,
  TFields extends ServerDefinedFields,
>(options: SaveRecordOptions<TTable, TFields>) {
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
  const revisionChanges =
    options.revisionChanges ?? changes ?? Object.keys(values);

  if (changes && changes.length === 0 && revisionChanges.length === 0) {
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
  const additionalPreparations = options.additionalPreparations ?? [];
  let afterFailure = additionalPreparations.flatMap(
    (preparation) => preparation.afterFailure,
  );
  let committed = false;

  try {
    // Inside the try so an authentication failure still runs the failure
    // tasks of already-staged additional preparations.
    const user = await requireUser();
    const preparation = await prepareRecordFields({
      admin,
      fields,
      columns: getTableColumns(table),
      id,
      shouldSaveField,
      table,
      user,
      values,
    });

    if (preparation.status === "error") {
      await runSaveTasks(afterFailure);
      return { status: "error" as const, error: preparation.message };
    }
    afterFailure = [...preparation.afterFailure, ...afterFailure];

    const result = await db.transaction((tx) =>
      savePreparedRecord({
        revisionChanges,
        revisionRelations: options.revisionRelations,
        admin,
        fields,
        id,
        preparation,
        query: options.query,
        shouldSaveField,
        table,
        tx,
        user,
        afterSave: options.afterSave,
      }),
    );

    if (result.status !== "success") {
      await runSaveTasks(afterFailure);
      return result;
    }
    committed = true;

    // Invalidate before follow-up tasks or audit can fail or read stale data.
    try {
      revalidator(revalidate, result.row);
    } finally {
      await runSaveTasks([
        ...preparation.afterCommit,
        ...additionalPreparations.flatMap(
          (additional) => additional.afterCommit,
        ),
      ]);
    }

    await audit({
      action,
      table: tableName,
      rowId: result.row?.id,
      data: { changes: revisionChanges },
    });

    return result;
  } catch (err) {
    if (!committed) {
      await runSaveTasks(afterFailure);
    }

    const error = options.translateError?.(err) ?? errorTranslator(err);
    if (error) {
      return {
        status: "error" as const,
        error: {
          message: error.message ?? "We couldn't complete your request.",
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
          ...(error.redirect ? { redirect: error.redirect } : {}),
        },
      };
    }
    throw err;
  }
}

// Prepares changed fields and collects work for the transaction, commit, and failure boundaries.
export async function prepareRecordFields<TTable extends NumericIdTable>({
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
        db,
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
      await runSaveTasks(afterFailure);
      return {
        status: "error" as const,
        message: result.message,
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

// Persists one prepared record inside an existing transaction and builds its revision snapshot.
export async function savePreparedRecord<
  TTable extends NumericIdTable,
  TFields extends ServerDefinedFields,
>({
  revisionChanges,
  revisionRelations,
  admin,
  fields,
  id,
  afterSave,
  preparation,
  query,
  revision = true,
  shouldSaveField = () => true,
  table,
  tx,
  user,
}: {
  revisionChanges?: string[];
  revisionRelations?: RevisionRelations;
  admin: boolean;
  fields: TFields;
  id?: number | null;
  afterSave?: SaveRecordOptions<TTable, TFields>["afterSave"];
  preparation: RecordPreparation;
  query?: SaveRecordOptions<TTable, TFields>["query"];
  revision?: boolean;
  shouldSaveField?: (key: string) => boolean;
  table: TTable;
  tx: DbTransaction;
  user: User;
}) {
  const data: Record<string, unknown> = {};
  const handledValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(preparation.values)) {
    if (!shouldSaveField(key)) {
      continue;
    }

    if (fields[key]?.save) {
      handledValues[key] = value;
    } else {
      data[key] = value;
    }
  }

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
    values: preparation.values,
    shouldSaveField,
  });

  if (preSave.status === "error") {
    return { status: "error" as const, error: preSave.message };
  }

  const select = selectFields(table, fields);
  let savedRow: SelectedFieldValues<TTable, TFields> | undefined;

  if (query) {
    savedRow = await query({ tx, data, select, user });
  } else if (id) {
    const columns = getTableColumns(table);
    const [row] = await tx
      .update(table)
      .set({
        ...data,
        ...("updatedAt" in columns ? { updatedAt: new Date() } : {}),
      })
      .where(
        and(
          eq(table.id, id),
          !admin && columns.deletedAt ? isNull(columns.deletedAt) : undefined,
        ),
      )
      .returning(select);
    savedRow = row;
  } else {
    const columns = getTableColumns(table);
    const [row] = await tx
      .insert(table)
      .values({
        ...data,
        ...("createdBy" in columns ? { createdBy: user.id } : {}),
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
  await Promise.all(preSave.afterSave.map((afterSave) => afterSave(tx)));

  for (const [fieldKey, value] of Object.entries(handledValues)) {
    const field = fields[fieldKey];
    if (field?.save) {
      savedValues[fieldKey] = await field.save({
        admin,
        db: tx,
        key: fieldKey,
        tableId: savedRow.id,
        value,
        values: preparation.values,
        user,
      });
    }
  }

  await Promise.all(preparation.afterSave.map((afterSave) => afterSave(tx)));
  Object.assign(savedValues, preparation.savedValues);
  const afterResult = await afterSave?.({
    tx,
    row: savedRow,
    values: preparation.values,
    savedValues,
    user,
  });
  const revisionValues = {
    ...savedValues,
    ...afterResult?.revisionValues,
  };

  if (revision) {
    const snapshotChanges = revisionChanges ?? Object.keys(preparation.values);

    if (snapshotChanges.length === 0) {
      return {
        status: "success" as const,
        row: savedRow,
        values: savedValues,
      };
    }

    await tx.insert(revisions).values({
      table: getTableName(table),
      rowId: savedRow.id,
      createdBy: user.id,
      changes: snapshotChanges,
      snapshot: filterRevisionSnapshot(
        revisionValues,
        fields,
        revisionRelations,
      ),
    });
  }

  return {
    status: "success" as const,
    row: savedRow,
    values: savedValues,
  };
}

async function runSaveTasks(tasks: FieldSaveTask[]) {
  await Promise.allSettled(tasks.map((task) => task()));
}

async function preSaveFields<TTable extends NumericIdTable>({
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
  tx: DbTransaction;
  values: Record<string, unknown>;
  shouldSaveField: (key: string) => boolean;
}) {
  const afterSave: FieldAfterSave[] = [];

  for (const key of Object.keys(values)) {
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

import { deps } from "@app/deps";
import { filterRevisionSnapshot } from "./revisions";
import { selectFields } from "@kenstack/fields/select";
import type {
  FieldPreSaveResult,
  ServerDefinedFields,
} from "@kenstack/fields/server";
import { revisions } from "@kenstack/db/tables/revisions";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import type { User } from "@kenstack/types";
import {
  eq,
  getTableColumns,
  getTableName,
  type InferInsertModel,
  type InferSelectModel,
} from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

type TransactionDb = Parameters<
  Parameters<(typeof deps)["db"]["transaction"]>[0]
>[0];

type SaveRecordTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
  createdAt: AnyPgColumn<{ data: Date; notNull: true }>;
  updatedAt: AnyPgColumn<{ data: Date; notNull: true }>;
};

type DefaultSaveRecordTable = SaveRecordTable & {
  createdBy: AnyPgColumn<{ data: number | null; notNull: false }>;
};

type SavedRow = {
  id: number;
} & Record<string, unknown>;

type SaveRecordSelect = ReturnType<
  typeof selectFields<SaveRecordTable, ServerDefinedFields>
>;

type RevalidateCallback<TTable extends SaveRecordTable> = {
  bivarianceHack(row: InferSelectModel<TTable>): string;
}["bivarianceHack"];

type SaveRecordResult =
  | {
      status: "success";
      row?: SavedRow;
      values: Record<string, unknown>;
    }
  | {
      status: "error";
      error: SaveRecordError;
    };

type SaveRecordError =
  | string
  | {
      message: string;
      status?: number;
      formErrors?: string[];
      fieldErrors?: Record<string, string | string[]>;
    };

type SaveRecordQuery = (ctx: {
  tx: TransactionDb;
  data: Record<string, unknown>;
  select: SaveRecordSelect;
  user: User;
}) => Promise<SavedRow | undefined>;

type SaveRecordOptions<TTable extends SaveRecordTable> = {
  action: string;
  table: TTable;
  fields: ServerDefinedFields;
  values: Record<string, unknown>;
  changes?: string[];
  id?: number | null;
  revalidate?: (string | RevalidateCallback<TTable>)[];
};

type CustomSaveRecordOptions<TTable extends SaveRecordTable> =
  SaveRecordOptions<TTable> & {
    query: SaveRecordQuery;
  };

type DefaultSaveRecordOptions<TTable extends DefaultSaveRecordTable> =
  SaveRecordOptions<TTable> & {
    query?: undefined;
  };

export function saveRecord<TTable extends DefaultSaveRecordTable>(
  options: DefaultSaveRecordOptions<TTable>,
): Promise<SaveRecordResult>;
export function saveRecord<TTable extends SaveRecordTable>(
  options: CustomSaveRecordOptions<TTable>,
): Promise<SaveRecordResult>;
export async function saveRecord<
  TDefaultTable extends DefaultSaveRecordTable,
  TCustomTable extends SaveRecordTable,
>(
  options:
    | DefaultSaveRecordOptions<TDefaultTable>
    | CustomSaveRecordOptions<TCustomTable>,
): Promise<SaveRecordResult> {
  const { action, table, fields, values, changes, id, revalidate } = options;
  const changedFields = changes ? new Set(changes) : undefined;
  const shouldSaveField = (key: string) =>
    !changedFields || changedFields.has(key);
  const data = Object.fromEntries(
    Object.entries(values).filter(([key]) => shouldSaveField(key)),
  );
  const revisionChanges = changes ?? Object.keys(values);
  const shouldWrite = !changes || changes.length > 0;
  const handledValues = Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => Boolean(fields[key]?.behavior?.save))
      .map(([key, value]) => [key, value]),
  );

  for (const key of Object.keys(handledValues)) {
    delete data[key];
  }

  const columns = getTableColumns(table);
  const user = await deps.auth.requireUser();

  if (!shouldWrite) {
    return {
      status: "success",
      ...(id ? { row: { id, ...values } } : {}),
      values,
    };
  }

  try {
    const row = await deps.db.transaction(async (tx) => {
      const preSave = await preSaveFields({
        fields,
        columns,
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

      let savedRow;

      if (options.query) {
        savedRow = await options.query({
          tx,
          data,
          select: selectFields(options.table, fields),
          user,
        });
      } else {
        savedRow = await defaultSaveRecordQuery({
          tx,
          data,
          select: selectFields(options.table, fields),
          user,
          table: options.table,
          id,
        });
      }
      if (!savedRow) {
        return {
          status: "error" as const,
          error: "Unable to save this record.",
        };
      }

      if (preSave.afterSave.length) {
        await Promise.all(preSave.afterSave.map((afterSave) => afterSave(tx)));
      }

      for (const [fieldKey, value] of Object.entries(handledValues)) {
        const behavior = fields[fieldKey]?.behavior;
        if (!behavior?.save) {
          continue;
        }

        savedRow[fieldKey] = await behavior.save({
          db: tx,
          key: fieldKey,
          tableId: savedRow.id,
          value,
          values,
          user,
        });
      }

      await tx.insert(revisions).values({
        table: getTableName(table),
        rowId: savedRow.id,
        createdBy: user.id,
        changes: revisionChanges,
        snapshot: filterRevisionSnapshot(savedRow, fields),
      });

      return {
        status: "success" as const,
        row: savedRow,
        values: savedRow,
      };
    });

    if (row.status !== "success") {
      return row;
    }

    await deps.logger.audit({
      action,
      table: getTableName(table),
      rowId: row.row?.id,
      data: { changes: revisionChanges },
    });

    revalidate?.forEach((validator) => {
      if (typeof validator === "string") {
        revalidateTag(validator, "max");
      } else if (row.row) {
        revalidateTag(
          validator(row.row as InferSelectModel<TDefaultTable & TCustomTable>),
          "max",
        );
      }
    });

    return row;
  } catch (err) {
    const error = errorTranslator(err);
    if (error) {
      return {
        status: "error",
        error: {
          message: error.message ?? "We couldn't complete your request.",
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
      };
    }
    throw err;
  }
}

async function defaultSaveRecordQuery<TTable extends SaveRecordTable>({
  tx,
  data,
  select,
  user,
  table,
  id,
}: {
  tx: TransactionDb;
  data: Record<string, unknown>;
  select: SaveRecordSelect;
  user: User;
  table: TTable;
  id?: number | null;
}): Promise<SavedRow | undefined> {
  if (id) {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    } as Partial<InferInsertModel<TTable>>;

    const [row] = await tx
      .update(table)
      .set(updateData)
      .where(eq(table.id, id))
      .returning(select);

    return row;
  }

  const insertData = {
    ...data,
    createdBy: user.id,
  } as InferInsertModel<TTable>;

  const [row] = await tx.insert(table).values(insertData).returning(select);

  return row;
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
  const afterSave: NonNullable<
    Extract<FieldPreSaveResult, { status: "success" }>["afterSave"]
  > = [];

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

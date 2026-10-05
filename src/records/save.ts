import "server-only";

import { db } from "@app/db";
import { modules } from "@app/modules";
import { requireUser } from "@kenstack/auth/server/user";
import { audit } from "@kenstack/logger";
import type { DbTransaction, NumericIdTable } from "@kenstack/db/types";
import {
  filterRevisionSnapshot,
  insertRevision,
  type RevisionRelations,
} from "./revisions";
import { recordChangedCode } from "./conflict";
import { loadRecord } from "./load";
import { selectFields } from "./select";
import type { FieldAfterSave, FieldSaveTask } from "@kenstack/fields/server";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";
import { getFieldSetRefinements } from "@kenstack/fields/internal/fieldSetRefinements";
import { oneToOneSelectionFieldName } from "@kenstack/admin/internal/oneToOne";
import { revisions } from "@kenstack/db/tables/revisions";
import { nextUpdatedAt } from "@kenstack/db/updatedAt";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import type { User } from "@kenstack/types";
import { formatUserName } from "@kenstack/lib/user";
import { revalidator, type RevalidateTagRule } from "@kenstack/lib/revalidate";
import type { FetchError } from "@kenstack/api/fetcher";
import {
  and,
  asc,
  eq,
  getTableColumns,
  getTableName,
  isNull,
  sql,
  type InferInsertModel,
} from "drizzle-orm";
import camelCase from "lodash-es/camelCase";
import startCase from "lodash-es/startCase";
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
  // The record's token when the editor loaded it. A record that changed since merges the save when
  // the changes are to other fields and refuses it when they overlap. Null for a record that did not
  // exist at load; omitted for a save that does not compare, such as a site form.
  updatedAt?: Date | null;
  revalidate?: RevalidateTagRule<SelectedFieldValues<TTable, TFields>>[];
  // Replaces the default update or insert. With a token, the save first claims it with one
  // conditional update of the row, so the custom write runs only over the current record.
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
  // The acting user, when it is not the session's: Kenstack's account creation saves a new account as
  // that account, before it signs in. Not for hosts.
  user?: User;
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
  const action = camelCase(`${actionPrefix} ${id ? "update" : "insert"}`);
  const revisionChanges =
    options.revisionChanges ?? changes ?? Object.keys(values);

  // A save with nothing to record writes nothing, so the token it started from still stands.
  if (revisionChanges.length === 0) {
    return {
      status: "success" as const,
      ...(id ? { row: { id } } : {}),
      values,
      updatedAt: options.updatedAt,
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
    const user = options.user ?? (await requireUser());
    const preparation = await prepareRecordFields({
      admin,
      fields,
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
        updatedAt: options.updatedAt,
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
      // The acting user, which for account creation is not the session's.
      actor: user,
      table: tableName,
      rowId: result.row?.id,
      data: { changes: revisionChanges },
    });

    return result;
  } catch (err) {
    if (!committed) {
      await runSaveTasks(afterFailure);
    }

    // A refused save committed nothing, so it expires no caches.
    if (err instanceof RecordChangedError) {
      return {
        status: "error" as const,
        error: { code: recordChangedCode, message: err.message },
      };
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
export async function prepareRecordFields({
  admin,
  fields,
  id,
  shouldSaveField,
  table,
  user,
  values,
}: {
  admin: boolean;
  fields: ServerDefinedFields;
  id?: number | null;
  shouldSaveField: (key: string) => boolean;
  table: NumericIdTable;
  user: User;
  values: Record<string, unknown>;
}) {
  const columns = getTableColumns(table);
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
  updatedAt,
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
  updatedAt?: Date | null;
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
  const columns = getTableColumns(table);
  const snapshotChanges = revisionChanges ?? Object.keys(preparation.values);
  // Updates a live row, and with a token only while the row is still as the editor loaded it; a null
  // token never matches. The token is always set, so a save that changes only relationships still
  // moves it and Drizzle never meets an empty SET.
  const updateRecord = async (
    id: number,
    values: Record<string, unknown>,
    token?: Date | null,
  ) => {
    const [row] = await tx
      .update(table)
      .set({
        ...values,
        ...("updatedAt" in columns
          ? { updatedAt: nextUpdatedAt(getTableName(table)) }
          : {}),
      })
      .where(
        and(
          eq(table.id, id),
          columns.deletedAt ? isNull(columns.deletedAt) : undefined,
          token === undefined
            ? undefined
            : token
              ? sql`date_trunc('milliseconds', ${columns.updatedAt}) = ${token.toISOString()}`
              : sql`false`,
        ),
      )
      .returning(select);
    return row;
  };
  // A miss: the record changed since load, or is gone. The lock reconcileChange takes is held to the
  // end of the transaction, so the write after it needs no token.
  const reconcile = (id: number, token: Date | null) =>
    reconcileChange({
      changes: snapshotChanges,
      fields,
      id,
      revisionRelations,
      select,
      table,
      tx,
      updatedAt: token,
    });

  let savedRow: SelectedFieldValues<TTable, TFields> | undefined;
  let merged = false;
  if (query) {
    if (
      id &&
      updatedAt !== undefined &&
      !(await updateRecord(id, {}, updatedAt))
    ) {
      await reconcile(id, updatedAt);
      merged = true;
    }
    savedRow = await query({ tx, data, select, user });
  } else if (id) {
    savedRow = await updateRecord(id, data, updatedAt);
    if (!savedRow && updatedAt !== undefined) {
      await reconcile(id, updatedAt);
      merged = true;
      savedRow = await updateRecord(id, data);
    }
  } else {
    [savedRow] = await tx
      .insert(table)
      .values({
        ...data,
        ...("createdBy" in columns ? { createdBy: user.id } : {}),
      } as InferInsertModel<TTable>)
      .returning(select);
  }

  // A record that did not exist at load, which someone else has created since: it has no id to
  // reconcile by, so it refuses whatever they changed.
  if (!savedRow && updatedAt === null) {
    throw new RecordChangedError(changedMessage);
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

  if (!revision) {
    return {
      status: "success" as const,
      row: savedRow,
      values: savedValues,
    };
  }

  // Inserted last, so it carries the save's final token.
  return {
    status: "success" as const,
    row: savedRow,
    // The editor of a merged save has not seen the other changes, so it gets the whole record to adopt
    // with the token, as the edit loader would load it.
    values: merged
      ? {
          ...savedValues,
          ...(await loadRecord({ db: tx, table, fields, id: savedRow.id })),
        }
      : savedValues,
    updatedAt: await insertRevision(tx, {
      changes: snapshotChanges,
      createdBy: user.id,
      rowId: savedRow.id,
      snapshot: filterRevisionSnapshot(
        revisionValues,
        fields,
        revisionRelations,
      ),
      table,
    }),
  };
}

// A save the record's revisions refuse.
class RecordChangedError extends Error {}

// Decides a save whose token no longer matches, holding the row's lock. Every participating writer
// records a revision in the transaction that moves the token, so the revisions since the editor's
// token are every change they have not seen. Changes to other fields merge; a change to the same
// field refuses.
async function reconcileChange({
  changes,
  fields,
  id,
  revisionRelations = {},
  select,
  table,
  tx,
  updatedAt,
}: {
  changes: string[];
  fields: ServerDefinedFields;
  id: number;
  revisionRelations?: RevisionRelations;
  select: ReturnType<typeof selectFields>;
  table: NumericIdTable;
  tx: DbTransaction;
  updatedAt: Date | null;
}) {
  const columns = getTableColumns(table);
  const [current] = await tx
    .select(select)
    .from(table)
    .where(
      and(
        eq(table.id, id),
        columns.deletedAt ? isNull(columns.deletedAt) : undefined,
      ),
    )
    .for("update");
  if (!current) {
    throw new RecordChangedError(
      "This record has been deleted, so your changes were not saved.",
    );
  }

  const users = modules.users.admin.table;
  const later = await tx
    .select({
      changes: revisions.changes,
      hasCurrentToken: sql<boolean>`date_trunc('milliseconds', ${revisions.createdAt}) = (select date_trunc('milliseconds', ${columns.updatedAt}) from ${table} where ${table.id} = ${id})`,
      email: users.email,
      familyName: users.familyName,
      givenName: users.givenName,
    })
    .from(revisions)
    .leftJoin(users, eq(revisions.createdBy, users.id))
    .where(
      and(
        eq(revisions.table, getTableName(table)),
        eq(revisions.rowId, id),
        updatedAt
          ? sql`date_trunc('milliseconds', ${revisions.createdAt}) > ${updatedAt.toISOString()}`
          : undefined,
      ),
    )
    .orderBy(asc(revisions.createdAt), asc(revisions.id));

  // Missing history, from a writer that records no revision or from before revisions carried the
  // token, never counts as another field's change.
  if (!later.at(-1)?.hasCurrentToken) {
    throw new RecordChangedError(changedMessage);
  }

  // A field set that checks its fields against each other validated each save alone, so a merge
  // could break it: any change counts as overlapping.
  const isRefined = [
    fields,
    ...Object.values(revisionRelations).map((relation) => relation.fields),
  ].some((fieldSet) => getFieldSetRefinements(fieldSet).length > 0);
  // The one-to-one selection decides which relation is live, so it overlaps every relation subfield.
  const overlaps = (key: string, other: string) =>
    key === other ||
    (key === oneToOneSelectionFieldName && other.includes(".")) ||
    (other === oneToOneSelectionFieldName && key.includes("."));
  const overlapping = later.flatMap((revision) => {
    const keys = isRefined
      ? revision.changes
      : revision.changes.filter((key) =>
          changes.some((own) => overlaps(key, own)),
        );
    return keys.length ? [{ ...revision, keys }] : [];
  });
  if (!overlapping.length) {
    return;
  }

  const list = new Intl.ListFormat("en", { type: "conjunction" });
  const people = new Set(
    overlapping.map((revision) =>
      formatUserName(revision, { fallback: "Someone" }),
    ),
  );
  const labels = new Set(
    overlapping.flatMap(({ keys }) =>
      keys.map((key) => {
        const [name, subfield] = key.split(".");
        const field = subfield
          ? revisionRelations[name]?.fields[subfield]
          : fields[name];
        return field?.label ?? startCase(subfield ?? name);
      }),
    ),
  );
  throw new RecordChangedError(
    `${list.format(people)} changed ${list.format(labels)} after you opened this record. Reload to see ${overlapping.length > 1 ? "their changes" : "their change"}.`,
  );
}

const changedMessage =
  "This record changed after you opened it. Reload to see the current version.";

async function runSaveTasks(tasks: FieldSaveTask[]) {
  await Promise.allSettled(tasks.map((task) => task()));
}

async function preSaveFields({
  admin,
  fields,
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
  data: Record<string, unknown>;
  handledValues: Record<string, unknown>;
  id?: number | null;
  user: User;
  table: NumericIdTable;
  tx: DbTransaction;
  values: Record<string, unknown>;
  shouldSaveField: (key: string) => boolean;
}) {
  const columns = getTableColumns(table);
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

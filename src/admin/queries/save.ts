import { revalidateTag } from "next/cache";
import { and, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import isEqual from "lodash-es/isEqual";

import { deps } from "@app/deps";
import type { DefinedAdminModule } from "../module";
import {
  prepareRecordFields,
  savePreparedRecord,
  saveRecord,
  loadRecord,
  type RecordPreparation,
  type SavedRow,
} from "@kenstack/fields/records";
import { selectFields } from "@kenstack/fields/select";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import type { User } from "@kenstack/types";
import type { FetchError } from "@kenstack/api/fetcher";
import type { AdminOneToOneBinding } from "@kenstack/admin/module";
import type { DbTransaction } from "@kenstack/db/types";
import { isRecord } from "@kenstack/lib/isRecord";
import type { ServerDefinedFields } from "@kenstack/fields/server";
import { adminLoadCacheTag } from "./load";
import { adminListCacheTag } from "./list";

class OneToOneSaveError extends Error {
  constructor(readonly fetchError: FetchError) {
    super(fetchError.message);
  }
}

type ModuleRecordSave = {
  changes?: string[];
  id?: number | null;
  module: DefinedAdminModule;
  values: Record<string, unknown>;
};

export function saveModuleRecord(
  options: ModuleRecordSave & { fields: ServerDefinedFields },
) {
  return saveModule(options, false);
}

export async function saveAdminRecord({
  changes,
  id,
  module,
  values,
}: ModuleRecordSave) {
  const { admin: adminConfig } = module;
  const oneToOne = adminConfig.oneToOne;
  if (!oneToOne) {
    return saveModule(
      {
        changes,
        fields: adminConfig.fields,
        id,
        module,
        values,
      },
      true,
    );
  }

  const relationSelections = oneToOne.relations;
  const submittedRelations = Object.entries(relationSelections).filter(
    ([relationName]) => Object.hasOwn(values, relationName),
  );

  if (submittedRelations.length > 1) {
    return {
      status: "error" as const,
      error: "Save one related section at a time.",
    };
  }

  const selectedRelationName = Object.entries(relationSelections).find(
    ([, binding]) => binding.value === values[oneToOne.field],
  )?.[0];
  if (!selectedRelationName) {
    return {
      status: "error" as const,
      error: {
        message: "Select a valid related type.",
        fieldErrors: {
          [oneToOne.field]: "Select a valid related type",
        },
      },
    };
  }

  const submittedRelation = submittedRelations[0];
  const preparedRelation = submittedRelation
    ? await prepareOneToOneSave({
        id,
        selectedRelationName,
        submittedRelation,
        values,
      })
    : undefined;
  if (preparedRelation?.status === "error") {
    return preparedRelation;
  }
  const parentValues = preparedRelation?.parentValues ?? values;
  const relatedSave = preparedRelation?.relatedSave;
  const relationName = relatedSave?.name;

  let parentChanges: string[] | undefined;
  const revisionChanges: string[] = [];
  if (id) {
    parentChanges = changes
      ? changes.filter((key) => key !== relationName)
      : [];
    revisionChanges.push(...parentChanges);
  } else {
    revisionChanges.push(...Object.keys(parentValues));
  }
  if (relatedSave) {
    for (const key of relatedSave.changes) {
      revisionChanges.push(`${relatedSave.name}.${key}`);
    }
  }

  const afterSave = async ({
    tx,
    row,
    savedValues,
    user,
  }: {
    tx: DbTransaction;
    row: SavedRow;
    savedValues: Record<string, unknown>;
    user: User;
  }) => {
    if (relatedSave) {
      const relatedValues = await saveOneToOne({
        binding: relatedSave.binding,
        changes: relatedSave.changes,
        expectedId: relatedSave.expectedId,
        parentId: row.id,
        preparation: relatedSave.preparation,
        translateError: adminConfig.translateError,
        relationName: relatedSave.name,
        tx,
        user,
      });
      savedValues[relatedSave.name] = {
        ...relatedSave.baseline,
        ...relatedValues,
      };
    }

    return {
      revisionValues: await loadRelationSnapshots(
        oneToOne.relations,
        row.id,
        tx,
      ),
    };
  };
  const translateError = (error: unknown) =>
    error instanceof OneToOneSaveError
      ? error.fetchError
      : adminConfig.translateError?.(error);
  return saveModule(
    {
      changes: parentChanges,
      fields: adminConfig.fields,
      id,
      module,
      values: parentValues,
    },
    true,
    {
      additionalPreparations: relatedSave
        ? [relatedSave.preparation]
        : undefined,
      afterSave,
      revisionChanges,
      translateError,
    },
  );
}

// Validates and prepares one submitted relation while retaining its full field context.
async function prepareOneToOneSave({
  id,
  selectedRelationName,
  submittedRelation: [name, binding],
  values,
}: {
  id?: number | null;
  selectedRelationName: string;
  submittedRelation: [string, AdminOneToOneBinding];
  values: Record<string, unknown>;
}) {
  const relatedValues = values[name];
  if (!isRecord(relatedValues)) {
    return {
      status: "error" as const,
      error: `Related section "${name}" must be an object.`,
    };
  }
  if (name !== selectedRelationName) {
    return {
      status: "error" as const,
      error: {
        message: `Related section "${name}" does not match the selected type.`,
        fieldErrors: {
          [name]: "This section does not match the selected type",
        },
      },
    };
  }

  const parentValues = Object.fromEntries(
    Object.entries(values).filter(([key]) => key !== name),
  );
  const relatedInput = Object.fromEntries(
    Object.entries(relatedValues).filter(([key]) => key !== "id"),
  );
  let expectedId: number | null = null;
  let baseline: Record<string, unknown> | undefined;
  if (id) {
    expectedId = await loadRelationId({
      parentId: id,
      binding,
      db: deps.db,
    });
    if (expectedId) {
      baseline = await loadActiveRelatedValues(binding, expectedId);
    }
  }

  const relatedChanges = baseline
    ? Object.fromEntries(
        Object.entries(relatedInput).filter(
          ([key, value]) => !isEqual(value, baseline[key]),
        ),
      )
    : relatedInput;
  const changes = Object.keys(relatedChanges);
  const changedFields = new Set(changes);
  const preparation = await prepareRecordFields({
    admin: true,
    fields: binding.fields,
    columns: getTableColumns(binding.table),
    id: expectedId ?? undefined,
    shouldSaveField: (key) => changedFields.has(key),
    table: binding.table,
    user: await deps.auth.requireUser(),
    values: relatedInput,
  });
  if (preparation.status === "error") {
    return {
      status: "error" as const,
      error: preparation.message,
    };
  }

  return {
    status: "success" as const,
    parentValues,
    relatedSave: {
      baseline,
      binding,
      changes,
      expectedId,
      name,
      preparation,
    },
  };
}

// Saves a module record through the field lifecycle and refreshes its admin cache.
async function saveModule(
  {
    changes,
    fields,
    id,
    module,
    values,
  }: ModuleRecordSave & { fields: ServerDefinedFields },
  admin: boolean,
  extensions: Pick<
    Parameters<typeof saveRecord>[0],
    | "additionalPreparations"
    | "afterSave"
    | "revisionChanges"
    | "translateError"
  > = {},
) {
  const { name, admin: adminConfig } = module;
  const actionPrefix = admin ? "admin" : name;
  const saveOptions = {
    actionPrefix,
    admin,
    table: adminConfig.table,
    fields,
    values,
    changes: id ? changes : undefined,
    id,
    revalidate: adminConfig.revalidate,
    translateError: admin ? adminConfig.translateError : undefined,
    ...extensions,
  };
  let result;
  if (!("list" in adminConfig)) {
    result = await saveRecord({
      ...saveOptions,
      query: async ({ tx, data, select, user }) => {
        const [row] = await tx
          .insert(adminConfig.table)
          .values({
            key: name,
            createdBy: user.id,
            ...data,
          })
          .onConflictDoUpdate({
            target: adminConfig.table.key,
            set: {
              ...data,
              updatedAt: new Date(),
            },
          })
          .returning(select);

        return row;
      },
    });
  } else {
    const appendToReorder = !id && adminConfig.list.reorder;
    if (!appendToReorder) {
      result = await saveRecord(saveOptions);
    } else {
      result = await saveRecord({
        ...saveOptions,
        query: async ({ tx, data, select, user }) => {
          const [position] = await tx
            .select({
              sortOrder:
                sql<number>`coalesce(max(${appendToReorder.field}), 0) + 10`.mapWith(
                  Number,
                ),
            })
            .from(adminConfig.table)
            .where(isNull(adminConfig.table.deletedAt));
          const [row] = await tx
            .insert(adminConfig.table)
            .values({
              ...data,
              [appendToReorder.fieldKey]: position?.sortOrder ?? 10,
              createdBy: user.id,
            })
            .returning(select);

          return row;
        },
      });
    }
  }

  if (result.status === "success") {
    if ("list" in adminConfig) {
      const savedId = result.row?.id ?? id;
      if (savedId) {
        revalidateTag(adminLoadCacheTag(name, savedId), { expire: 0 });
      }

      revalidateTag(adminListCacheTag(name), { expire: 0 });
    } else {
      revalidateTag(adminLoadCacheTag(name, "single"), { expire: 0 });
    }
  }

  return result;
}

// Saves a parent-owned relation in the parent transaction and rejects concurrent replacement.
async function saveOneToOne({
  binding,
  changes,
  expectedId,
  parentId,
  preparation,
  translateError,
  relationName,
  tx,
  user,
}: {
  binding: AdminOneToOneBinding;
  changes: string[];
  expectedId: number | null;
  parentId: number;
  preparation: RecordPreparation;
  translateError?: (error: unknown) => FetchError | undefined;
  relationName: string;
  tx: DbTransaction;
  user: User;
}) {
  const relationId = await loadRelationId({
    parentId,
    binding,
    db: tx,
    lock: true,
  });

  if (relationId !== expectedId) {
    throw new OneToOneSaveError({
      status: "error",
      message: "This related record changed. Reload the page and try again.",
    });
  }

  const existing = relationId
    ? await loadActiveRelated(binding, relationId, tx)
    : undefined;
  if (relationId && !existing) {
    throw new OneToOneSaveError({
      status: "error",
      message: "The parent-owned detail is unavailable.",
      fieldErrors: {
        [relationName]: "Reload the page and try again.",
      },
    });
  }

  if (!changes.length && existing) {
    return existing;
  }

  let saved;
  try {
    saved = await savePreparedRecord({
      admin: true,
      fields: binding.fields,
      id: existing?.id,
      preparation,
      revision: false,
      table: binding.table,
      tx,
      user,
      query: !existing
        ? async ({ tx: queryTx, data, select, user }) => {
            const [row] = await queryTx
              .insert(binding.table)
              .values({
                ...data,
                id: parentId,
                ...("createdBy" in getTableColumns(binding.table)
                  ? { createdBy: user.id }
                  : {}),
              })
              .returning(select);

            return row;
          }
        : undefined,
      shouldSaveField: (key) => changes.includes(key),
    });
  } catch (error) {
    const translated = prefixRelatedError(
      relationName,
      translateError?.(error) ?? errorTranslator(error),
    );
    if (translated) {
      throw new OneToOneSaveError(translated);
    }
    throw error;
  }

  if (saved.status === "error") {
    throw new OneToOneSaveError({
      status: "error",
      message:
        typeof saved.error === "string"
          ? saved.error
          : "Unable to save this related record.",
    });
  }

  return saved.values;
}

// Loads the related record ID and locks an existing row when requested by a transactional save.
async function loadRelationId({
  parentId,
  binding,
  db,
  lock = false,
}: {
  parentId: number;
  binding: AdminOneToOneBinding;
  db: Pick<typeof deps.db, "select">;
  lock?: boolean;
}) {
  const query = db
    .select({ relationId: binding.table.id })
    .from(binding.table)
    .where(eq(binding.foreignKey, parentId))
    .limit(1);
  const [row] = await (lock ? query.for("update") : query);
  return typeof row?.relationId === "number" ? row.relationId : null;
}

// Loads an undeleted relation before updating it, preventing writes to a soft-deleted row.
async function loadActiveRelated(
  binding: AdminOneToOneBinding,
  id: number,
  tx: DbTransaction,
) {
  const columns = getTableColumns(binding.table);
  const [row] = await tx
    .select(selectFields(binding.table, binding.fields))
    .from(binding.table)
    .where(
      "deletedAt" in columns
        ? and(eq(binding.table.id, id), isNull(columns.deletedAt))
        : eq(binding.table.id, id),
    )
    .limit(1);

  return row;
}

// Loads a relation through its field lifecycle for normalized comparisons and revision data.
async function loadActiveRelatedValues(
  binding: AdminOneToOneBinding,
  id: number,
  db: Pick<typeof deps.db, "select"> = deps.db,
) {
  const columns = getTableColumns(binding.table);
  const result = await loadRecord({
    db,
    table: binding.table,
    fields: binding.fields,
    where:
      "deletedAt" in columns
        ? and(eq(binding.table.id, id), isNull(columns.deletedAt))
        : eq(binding.table.id, id),
  });

  return result.row ? result.values : undefined;
}

// Builds snapshots of active relations for inclusion in the parent revision.
async function loadRelationSnapshots(
  bindings: Record<string, AdminOneToOneBinding>,
  parentId: number,
  tx: DbTransaction,
) {
  const relations = await Promise.all(
    Object.entries(bindings).map(async ([name, binding]) => {
      const values = await loadActiveRelatedValues(binding, parentId, tx);
      return values ? ([name, values] as const) : null;
    }),
  );

  return Object.fromEntries(relations.filter((relation) => relation !== null));
}

// Prefixes relation field paths so nested persistence errors appear beside the correct form
// controls.
function prefixRelatedError(
  relationName: string,
  error: FetchError | undefined,
) {
  if (!error?.fieldErrors) {
    return error;
  }

  return {
    ...error,
    fieldErrors: Object.fromEntries(
      Object.entries(error.fieldErrors).map(([field, message]) => [
        `${relationName}.${field}`,
        message,
      ]),
    ),
  };
}

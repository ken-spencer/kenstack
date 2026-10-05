import { and, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db as appDb } from "@app/db";
import { requireUser } from "@kenstack/auth/server/user";
import type { DefinedAdminModule } from "../module";
import {
  prepareRecordFields,
  savePreparedRecord,
  saveRecord,
  loadRecord,
  type RecordPreparation,
  type SavedRow,
} from "@kenstack/records";
import { recordChangedCode } from "@kenstack/records/conflict";
import { selectFields } from "@kenstack/records/select";
import { errorTranslator } from "@kenstack/db/errorTranslator";
import type { User } from "@kenstack/types";
import type { FetchError } from "@kenstack/api/fetcher";
import type { AdminOneToOneBinding } from "@kenstack/admin/module";
import type { DbTransaction } from "@kenstack/db/types";
import { isRecord } from "@kenstack/lib/isRecord";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";
import { adminLoadCacheTag, adminListCacheTag } from "@kenstack/admin/cache";

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

// Saves only the fields present in the validated values, so the action's schema is the allowlist of
// what a member may change.
export function saveModuleRecord(options: ModuleRecordSave) {
  return saveModule(
    { ...options, fields: pickSubmittedFields(options.module, options.values) },
    false,
  );
}

// Kenstack's account creation: a member save acting as the new account, through its own insert.
export function saveModuleRecordAs(
  options: ModuleRecordSave,
  extensions: Parameters<typeof saveModule>[2],
) {
  return saveModule(
    { ...options, fields: pickSubmittedFields(options.module, options.values) },
    false,
    extensions,
  );
}

function pickSubmittedFields(
  module: DefinedAdminModule,
  values: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(module.admin.fields).filter(([key]) =>
      Object.hasOwn(values, key),
    ),
  );
}

export async function saveAdminRecord({
  changes,
  id,
  module,
  updatedAt,
  values,
}: ModuleRecordSave & { updatedAt: Date | null }) {
  const { admin: adminConfig } = module;
  if (!id && "list" in adminConfig && !adminConfig.create) {
    return {
      status: "error" as const,
      error: "New entries cannot be created in this module.",
    };
  }
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
      { updatedAt },
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
        changes,
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

  let parentChanges: string[] | undefined;
  const revisionChanges: string[] = [];
  if (id) {
    // A relation's changes arrive as dotted subfield keys.
    parentChanges = changes ? changes.filter((key) => !key.includes(".")) : [];
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
      await saveOneToOne({
        binding: relatedSave.binding,
        changes: relatedSave.changes,
        expectedId: relatedSave.expectedId,
        parentId: row.id,
        preparation: relatedSave.preparation,
        translateError: (error) =>
          relatedSave.binding.translateError?.(error) ??
          adminConfig.translateError?.(error),
        relationName: relatedSave.name,
        tx,
        user,
      });
    }

    const relationValues = await loadRelationSnapshots(
      oneToOne.relations,
      row.id,
      tx,
    );
    // The live relation goes back with every save, so a merged save's editor adopts it too.
    const liveRelation = Object.entries(oneToOne.relations).find(
      ([, binding]) => binding.value === row[oneToOne.field],
    )?.[0];
    if (liveRelation) {
      savedValues[liveRelation] = relationValues[liveRelation];
    }
    return { revisionValues: relationValues };
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
      updatedAt,
    },
  );
}

// Validates and prepares one submitted relation while retaining its full field context.
async function prepareOneToOneSave({
  changes: submittedChanges = [],
  id,
  selectedRelationName,
  submittedRelation: [name, binding],
  values,
}: {
  changes?: string[];
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
  const expectedId = id
    ? await loadRelationId({ parentId: id, binding, db: appDb })
    : null;

  // An existing relation saves only the subfields the editor changed, so a stale untouched subfield
  // is never written; a new one saves them all.
  const changes = expectedId
    ? submittedChanges.flatMap((key) => {
        const subfield = key.slice(name.length + 1);
        return key.startsWith(name + ".") &&
          Object.hasOwn(relatedInput, subfield)
          ? [subfield]
          : [];
      })
    : Object.keys(relatedInput);
  const changedFields = new Set(changes);
  const preparation = await prepareRecordFields({
    admin: true,
    fields: binding.fields,
    id: expectedId ?? undefined,
    shouldSaveField: (key) => changedFields.has(key),
    table: binding.table,
    user: await requireUser(),
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
    Parameters<
      typeof saveRecord<
        DefinedAdminModule["admin"]["table"],
        ServerDefinedFields
      >
    >[0],
    | "additionalPreparations"
    | "afterSave"
    | "query"
    | "revisionChanges"
    | "revisionRelations"
    | "translateError"
    | "updatedAt"
    | "user"
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
    revalidate: [
      ...("list" in adminConfig
        ? [
            (row: SavedRow) => adminLoadCacheTag(name, row.id),
            adminListCacheTag(name),
          ]
        : [adminLoadCacheTag(name, "single")]),
      name,
      ...(adminConfig.revalidate ?? []),
    ],
    revisionRelations: adminConfig.oneToOne?.relations,
    translateError: admin ? adminConfig.translateError : undefined,
    ...extensions,
  };
  let result;
  if (!("list" in adminConfig)) {
    // A known id updates only the changed columns through the default path.
    // The first save inserts the full row, since Postgres checks NOT NULL on
    // the proposed row. An editor's first save that finds the row already
    // created by someone else inserts nothing and refuses; a site form, which
    // sends no token, updates that row.
    result = await saveRecord({
      ...saveOptions,
      query: id
        ? undefined
        : async ({ tx, data, select, user }) => {
            const insert = tx.insert(adminConfig.table).values({
              key: name,
              createdBy: user.id,
              ...data,
            });
            const [row] = await (
              saveOptions.updatedAt === undefined
                ? insert.onConflictDoUpdate({
                    target: adminConfig.table.key,
                    set: data,
                  })
                : insert.onConflictDoNothing({ target: adminConfig.table.key })
            ).returning(select);

            return row;
          },
    });
  } else {
    const reorder = adminConfig.list.reorder;
    const scopeMayChange = Boolean(
      reorder?.scope &&
      (changes?.includes(reorder.scope.fieldKey) ||
        (changes === undefined &&
          Object.hasOwn(values, reorder.scope.fieldKey))),
    );
    if (!reorder || (id && !scopeMayChange)) {
      result = await saveRecord(saveOptions);
    } else {
      result = await saveRecord({
        ...saveOptions,
        query: async ({ tx, data, select, user }) => {
          const scopeValue = reorder.scope
            ? data[reorder.scope.fieldKey]
            : undefined;
          if (reorder.scope && scopeValue === undefined) {
            throw new Error(
              `Scoped reorder for module "${name}" requires a prepared value for scope field "${reorder.scope.fieldKey}", but it was undefined.`,
            );
          }
          let appendToReorder = !id;
          if (id && reorder.scope) {
            const [stored] = await tx
              .select({ scope: reorder.scope.field })
              .from(adminConfig.table)
              .where(eq(adminConfig.table.id, id));
            appendToReorder = stored?.scope !== scopeValue;
          }

          let orderedData = data;
          if (appendToReorder) {
            const [position] = await tx
              .select({
                sortOrder:
                  sql<number>`coalesce(max(${reorder.field}), 0) + 10`.mapWith(
                    Number,
                  ),
              })
              .from(adminConfig.table)
              .where(
                and(
                  isNull(adminConfig.table.deletedAt),
                  reorder.scope
                    ? eq(reorder.scope.field, scopeValue)
                    : undefined,
                ),
              );
            orderedData = {
              ...data,
              [reorder.fieldKey]: position?.sortOrder ?? 10,
            };
          }
          const [row] = id
            ? await tx
                .update(adminConfig.table)
                .set(orderedData)
                .where(eq(adminConfig.table.id, id))
                .returning(select)
            : await tx
                .insert(adminConfig.table)
                .values({
                  ...orderedData,
                  createdBy: user.id,
                })
                .returning(select);

          return row;
        },
      });
    }
  }

  // A refused save committed nothing; only the record the editor reloads may be stale.
  const target = "list" in adminConfig ? id : "single";
  if (
    result.status === "error" &&
    typeof result.error === "object" &&
    result.error.code === recordChangedCode &&
    target
  ) {
    revalidateTag(adminLoadCacheTag(name, target), { expire: 0 });
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
    return;
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
  db: Pick<typeof appDb, "select">;
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

// Loads a relation through its field lifecycle for the revision snapshot and the saved values.
async function loadActiveRelatedValues(
  binding: AdminOneToOneBinding,
  id: number,
  db: Pick<typeof appDb, "select">,
) {
  const columns = getTableColumns(binding.table);
  return loadRecord({
    db,
    table: binding.table,
    fields: binding.fields,
    where:
      "deletedAt" in columns
        ? and(eq(binding.table.id, id), isNull(columns.deletedAt))
        : eq(binding.table.id, id),
  });
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

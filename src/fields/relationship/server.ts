import "server-only";

import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  type AnyColumn,
} from "drizzle-orm";
import type * as z from "zod";

import type { Relationship } from "./relationships";
import {
  relationshipField as createRelationshipField,
  relationshipSchema,
} from ".";
import type { ServerDefinedFields } from "../internal/serverResolution";
import {
  serverField,
  type FieldLoadContext,
  type FieldSaveContext,
  type ServerFieldResolverFor,
} from "../serverField";

const multipleRelationshipField = createRelationshipField();

export function relationshipField(
  relationship: Relationship,
): ServerFieldResolverFor<typeof multipleRelationshipField> {
  return serverField(multipleRelationshipField, () => ({
    relationship,
    load({ db, tableId }) {
      return loadRelationship({
        db,
        tableId,
        relationship,
      });
    },
    save({ db, tableId, value }) {
      return saveRelationship({
        db,
        tableId,
        relationship,
        selected: value,
      });
    },
  }));
}

export function isRelationshipField(
  field: ServerDefinedFields[string] | undefined,
): field is ServerDefinedFields[string] & {
  relationship: Relationship;
} {
  return Boolean(field?.relationship);
}

export function relationshipFilterField(relationship: Relationship) {
  const where = [
    eq(relationship.fromColumn, relationship.fromPrimaryKey),
    eq(relationship.through.relationship, relationship.relationship),
  ];

  if (hasSoftDelete(relationship.through)) {
    where.push(isNull(relationship.through.deletedAt));
  }

  if (hasSoftDelete(relationship.to)) {
    where.push(isNull(relationship.to.deletedAt));
  }

  return sql<string[]>`coalesce(
    (
      select array_agg(${relationship.toPrimaryKey}::text)
      from ${relationship.through}
      inner join ${relationship.to}
        on ${relationship.toPrimaryKey} = ${relationship.toColumn}
      where ${and(...where)}
    ),
    array[]::text[]
  )`;
}

type SoftDeleteTable = {
  deletedAt: AnyColumn;
};

function hasSoftDelete(table: object): table is SoftDeleteTable {
  return "deletedAt" in table;
}

async function loadRelationship({
  db,
  tableId,
  relationship,
}: {
  db: FieldLoadContext["db"];
  tableId: number;
  relationship: Relationship;
}) {
  const label = relationship.label ?? relationship.toPrimaryKey;
  const where = [
    eq(relationship.fromColumn, tableId),
    eq(relationship.through.relationship, relationship.relationship),
  ];

  if (hasSoftDelete(relationship.through)) {
    where.push(isNull(relationship.through.deletedAt));
  }

  if (hasSoftDelete(relationship.to)) {
    where.push(isNull(relationship.to.deletedAt));
  }

  return db
    .select({
      id: sql<number>`${relationship.toPrimaryKey}`.mapWith(Number),
      label: sql<string>`${label}`.mapWith(String),
    })
    .from(relationship.through)
    .innerJoin(
      relationship.to,
      eq(relationship.toPrimaryKey, relationship.toColumn),
    )
    .where(and(...where))
    .orderBy(asc(sql`${label}`));
}

async function saveRelationship({
  db,
  tableId,
  relationship,
  selected,
}: {
  db: FieldSaveContext["db"];
  tableId: number;
  relationship: Relationship;
  selected: z.output<typeof relationshipSchema>;
}) {
  const where = [
    eq(relationship.fromColumn, tableId),
    eq(relationship.through.relationship, relationship.relationship),
  ];
  const currentWhere = [...where];

  if (hasSoftDelete(relationship.through)) {
    currentWhere.push(isNull(relationship.through.deletedAt));
  }

  const current = await db
    .select({
      id: sql<number>`${relationship.toColumn}`.mapWith(Number),
    })
    .from(relationship.through)
    .where(and(...currentWhere));
  const selectedIds = [...new Set(selected.map((item) => item.id))].sort(
    (a, b) => a - b,
  );
  const currentIds = [...new Set(current.map((item) => item.id))].sort(
    (a, b) => a - b,
  );
  if (
    selectedIds.length === currentIds.length &&
    selectedIds.every((id, index) => id === currentIds[index])
  ) {
    return selected;
  }

  const removedIds = currentIds.filter((id) => !selectedIds.includes(id));
  const addedIds = selectedIds.filter((id) => !currentIds.includes(id));

  if (removedIds.length) {
    if (hasSoftDelete(relationship.through)) {
      await db
        .update(relationship.through)
        .set({ deletedAt: new Date() })
        .where(
          and(
            ...where,
            inArray(relationship.toColumn, removedIds),
            isNull(relationship.through.deletedAt),
          ),
        );
    } else {
      await db
        .delete(relationship.through)
        .where(and(...where, inArray(relationship.toColumn, removedIds)));
    }
  }

  if (addedIds.length) {
    if (hasSoftDelete(relationship.through)) {
      await db
        .update(relationship.through)
        .set({ deletedAt: null })
        .where(
          and(
            ...where,
            inArray(relationship.toColumn, addedIds),
            isNotNull(relationship.through.deletedAt),
          ),
        );
    }

    await db
      .insert(relationship.through)
      .values(
        addedIds.map((id) => ({
          [relationship.fromColumnKey]: tableId,
          [relationship.toColumnKey]: id,
          relationship: relationship.relationship,
        })),
      )
      .onConflictDoNothing();
  }

  return selected;
}

import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import type { deps } from "@app/deps";
import isEqual from "lodash-es/isEqual";
import type * as z from "zod";

import type { Relationship, Relationships } from "../relationships";
import { relationshipSchema } from "../relationshipSchema";
import type {
  FieldBehavior,
  ServerField,
  ServerFieldDefaults,
  ServerFieldResolver,
} from ".";

type RelationshipFieldBehavior = FieldBehavior & {
  relationship: Relationship;
};

export function relationshipField(
  relationship: Relationship,
): ServerFieldResolver<ServerField & { kind: "relationship" }> {
  return (): ServerFieldDefaults => ({
    behavior: {
      filter: {
        field: relationshipFilterField(relationship),
        kind: "includes",
        options: [],
      },
      relationship,
      async load({ db, key, tableId }) {
        const values = await loadRelationships({
          db,
          tableId,
          relationships: { [key]: relationship },
        });

        return values[key] ?? [];
      },
      async save({ db, key, tableId, value }) {
        const values = await saveRelationships({
          db,
          tableId,
          relationships: { [key]: relationship },
          values: {
            [key]: value as z.output<typeof relationshipSchema>,
          },
        });

        return values[key] ?? [];
      },
    },
  });
}

export function isRelationshipField(
  field: ServerField | undefined,
): field is ServerField & {
  kind: "relationship";
  behavior: RelationshipFieldBehavior;
} {
  return (
    field?.kind === "relationship" && Boolean(field.behavior?.relationship)
  );
}

function relationshipFilterField(relationship: Relationship) {
  const where = [
    eq(relationship.fromColumn, relationship.fromPrimaryKey),
    eq(relationship.through.relationship, relationship.relationship),
  ];

  if ("deletedAt" in relationship.through) {
    const table = relationship.through as typeof relationship.through &
      SoftDeleteTable;
    where.push(isNull(table.deletedAt));
  }

  if ("deletedAt" in relationship.to) {
    const table = relationship.to as typeof relationship.to & SoftDeleteTable;
    where.push(isNull(table.deletedAt));
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

type RelationshipValues = Record<string, z.output<typeof relationshipSchema>>;

async function loadRelationships({
  db,
  tableId,
  relationships,
}: {
  db: Pick<typeof deps.db, "select">;
  tableId: number;
  relationships?: Relationships;
}) {
  const values: Record<string, { id: number; label: string }[]> = {};

  if (!relationships) {
    return values;
  }

  for (const [key, relationship] of Object.entries(relationships)) {
    const label = relationship.label ?? relationship.toPrimaryKey;
    const where = [
      eq(relationship.fromColumn, tableId),
      eq(relationship.through.relationship, relationship.relationship),
    ];

    if ("deletedAt" in relationship.through) {
      const table = relationship.through as typeof relationship.through &
        SoftDeleteTable;
      where.push(isNull(table.deletedAt));
    }

    if ("deletedAt" in relationship.to) {
      const table = relationship.to as typeof relationship.to & SoftDeleteTable;
      where.push(isNull(table.deletedAt));
    }

    values[key] = await db
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

  return values;
}

async function saveRelationships({
  db,
  tableId,
  relationships,
  values,
}: {
  db: Pick<typeof deps.db, "delete" | "insert" | "select" | "update">;
  tableId: number;
  relationships: Relationships;
  values: RelationshipValues;
}) {
  const savedValues: RelationshipValues = {};

  for (const [key, selected] of Object.entries(values)) {
    const relationship = relationships[key];
    if (!relationship) {
      continue;
    }

    const where = [
      eq(relationship.fromColumn, tableId),
      eq(relationship.through.relationship, relationship.relationship),
    ];

    const currentWhere = [...where];

    if ("deletedAt" in relationship.through) {
      const table = relationship.through as typeof relationship.through &
        SoftDeleteTable;
      currentWhere.push(isNull(table.deletedAt));
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

    if (isEqual(selectedIds, currentIds)) {
      savedValues[key] = selected;
      continue;
    }

    const removedIds = currentIds.filter((id) => !selectedIds.includes(id));
    const addedIds = selectedIds.filter((id) => !currentIds.includes(id));

    if (removedIds.length) {
      if ("deletedAt" in relationship.through) {
        const table = relationship.through as typeof relationship.through &
          SoftDeleteTable;

        await db
          .update(relationship.through)
          .set({ deletedAt: new Date() })
          .where(
            and(
              ...where,
              inArray(relationship.toColumn, removedIds),
              isNull(table.deletedAt),
            ),
          );
      } else {
        await db
          .delete(relationship.through)
          .where(and(...where, inArray(relationship.toColumn, removedIds)));
      }
    }

    if (addedIds.length) {
      if ("deletedAt" in relationship.through) {
        const table = relationship.through as typeof relationship.through &
          SoftDeleteTable;

        await db
          .update(relationship.through)
          .set({ deletedAt: null })
          .where(
            and(
              ...where,
              inArray(relationship.toColumn, addedIds),
              isNotNull(table.deletedAt),
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

    savedValues[key] = selected;
  }

  return savedValues;
}

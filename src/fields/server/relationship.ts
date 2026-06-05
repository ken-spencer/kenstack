import { and, asc, eq, isNull, sql } from "drizzle-orm";
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
  db: Pick<typeof deps.db, "delete" | "insert" | "select">;
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

    const current = await db
      .select({
        id: sql<number>`${relationship.toColumn}`.mapWith(Number),
      })
      .from(relationship.through)
      .where(
        and(
          eq(relationship.fromColumn, tableId),
          eq(relationship.through.relationship, relationship.relationship),
        ),
      );
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

    await db
      .delete(relationship.through)
      .where(
        and(
          eq(relationship.fromColumn, tableId),
          eq(relationship.through.relationship, relationship.relationship),
        ),
      );

    if (selected.length) {
      await db
        .insert(relationship.through)
        .values(
          selected.map((item) => ({
            [relationship.fromColumnKey]: tableId,
            [relationship.toColumnKey]: item.id,
            relationship: relationship.relationship,
          })),
        )
        .onConflictDoNothing();
    }

    savedValues[key] = selected;
  }

  return savedValues;
}

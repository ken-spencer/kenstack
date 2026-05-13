import { and, eq } from "drizzle-orm";

import type { Relationships } from "@kenstack/admin/relationships";
import type { deps } from "@app/deps";

type RelationshipInput = {
  id: number;
};

type RelationshipValues = Record<string, RelationshipInput[]>;

export function extractRelationshipValues({
  data,
  relationships,
}: {
  data: Record<string, unknown>;
  relationships?: Relationships;
}) {
  const values: RelationshipValues = {};

  if (!relationships) {
    return values;
  }

  for (const key of Object.keys(relationships)) {
    const value = data[key];
    if (!Array.isArray(value)) {
      continue;
    }

    values[key] = value.filter(isRelationshipInput);
  }

  return values;
}

export async function saveRelationships({
  db,
  tableId,
  relationships,
  values,
}: {
  db: Pick<typeof deps.db, "delete" | "insert">;
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

function isRelationshipInput(value: unknown): value is RelationshipInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number"
  );
}

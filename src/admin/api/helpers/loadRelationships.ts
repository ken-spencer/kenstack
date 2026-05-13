import { and, asc, eq, sql } from "drizzle-orm";

import type { Relationships } from "@kenstack/admin/relationships";
import type { deps } from "@app/deps";

export async function loadRelationships({
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
      .where(
        and(
          eq(relationship.fromColumn, tableId),
          eq(relationship.through.relationship, relationship.relationship),
        ),
      )
      .orderBy(asc(sql`${label}`));
  }

  return values;
}

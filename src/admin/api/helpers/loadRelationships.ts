import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

import type { Relationships } from "@kenstack/admin/relationships";
import type { deps } from "@app/deps";

type SoftDeleteTable = {
  deletedAt: AnyColumn;
};

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

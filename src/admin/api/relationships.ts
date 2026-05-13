import { and, asc, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import * as z from "zod";

import { deps } from "@app/deps";
import type { AdminApiOptions, AnyAdminTable } from "@kenstack/admin";
import { pipeline, pipelineStage } from "@kenstack/lib/api";

import type { AnyColumn } from "drizzle-orm";

const schema = z.object({
  relationship: z.string(),
  keywords: z.string(),
  exclude: z.array(z.number()).default([]),
});

type RelationshipResult = {
  id: number;
  label: string;
};

type SoftDeleteTable = {
  deletedAt: AnyColumn;
};

const relationships = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline(options, [relationshipsAction(adminTable)]);
};

const relationshipsAction = (adminTable: AnyAdminTable) =>
  pipelineStage({ role: "admin", schema }, async ({ response, data }) => {
    const relationship = adminTable.relationships?.[data.relationship];

    if (!relationship) {
      return response.error(
        `Unknown relationship "${data.relationship}" for this admin table.`,
      );
    }

    const keyword = data.keywords.trim();
    const label = relationship.label ?? relationship.toPrimaryKey;
    const search = relationship.search?.length ? relationship.search : [label];
    const where = [];

    if ("deletedAt" in relationship.to) {
      const table = relationship.to as typeof relationship.to & SoftDeleteTable;
      where.push(isNull(table.deletedAt));
    }

    if (data.exclude.length) {
      where.push(notInArray(relationship.toPrimaryKey, data.exclude));
    }

    if (keyword) {
      const conditions = search.map((column) => {
        return ilike(sql`${column}`, `%${keyword}%`);
      });

      where.push(or(...conditions));
    }

    const items = await deps.db
      .select({
        id: sql<number>`${relationship.toPrimaryKey}`.mapWith(Number),
        label: sql<string>`${label}`.mapWith(String),
      })
      .from(relationship.to)
      .where(where.length ? and(...where) : undefined)
      .orderBy(...(relationship.orderBy ?? [asc(sql`${label}`)]))
      .limit(10);

    return response.success({
      items: items satisfies RelationshipResult[],
    });
  });

export default relationships;

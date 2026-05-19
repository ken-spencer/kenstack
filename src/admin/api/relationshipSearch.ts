import { and, asc, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import * as z from "zod";

import { deps } from "@app/deps";
import type { AnyAdminConfig } from "@kenstack/admin";
import { pipelineStage } from "@kenstack/api";

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

export const relationshipSearchAction = (adminConfig: AnyAdminConfig) =>
  pipelineStage({ role: "admin", schema }, async ({ response, data }) => {
    const relationship = adminConfig.relationships?.[data.relationship];

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

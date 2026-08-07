import {
  and,
  asc,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  type AnyColumn,
} from "drizzle-orm";
import * as z from "zod";

import { deps } from "@app/deps";
import type { DefinedAdmin, DefinedAdminModule } from "@kenstack/admin/module";
import { resolveSingleRelationship } from "@kenstack/admin/lib/singleRelationship";
import { isSingleRelationshipField } from "@kenstack/fields/relationship";
import { isRelationshipField } from "@kenstack/fields/server";
import { pipelineStage } from "@kenstack/api";

const schema = z.object({
  relationship: z.string(),
  keywords: z.string(),
  exclude: z.array(z.number()).default([]),
  ids: z.array(z.number()).default([]),
});

export const relationshipSearchAction = (
  moduleConfig: DefinedAdminModule,
  modules: readonly DefinedAdmin[string][],
) =>
  pipelineStage({ access: "admin", schema }, async ({ response, data }) => {
    const field = moduleConfig.admin.fields[data.relationship];
    const relationship = isRelationshipField(field)
      ? field.relationship
      : undefined;
    const singleRelationship = isSingleRelationshipField(field)
      ? resolveSingleRelationship(moduleConfig, modules, data.relationship)
      : undefined;

    const resolved = relationship
      ? {
          label: relationship.label ?? relationship.toPrimaryKey,
          orderBy: relationship.orderBy,
          primaryKey: relationship.toPrimaryKey,
          search: relationship.search,
          table: relationship.to,
        }
      : singleRelationship;
    if (!resolved) {
      return response.error(
        `Unknown relationship "${data.relationship}" for this admin table.`,
      );
    }
    const keyword = data.keywords.trim();
    const { label, primaryKey, table } = resolved;
    const search = resolved.search?.length ? resolved.search : [label];
    const orderBy = resolved.orderBy ?? [asc(sql`${label}`)];
    const where = [];

    if ("deletedAt" in table) {
      where.push(
        isNull((table as typeof table & { deletedAt: AnyColumn }).deletedAt),
      );
    }

    if (data.ids.length) {
      where.push(inArray(primaryKey, data.ids));
    } else {
      if (data.exclude.length) {
        where.push(notInArray(primaryKey, data.exclude));
      }

      if (keyword) {
        where.push(
          or(...search.map((column) => ilike(sql`${column}`, `%${keyword}%`))),
        );
      }
    }

    const items = await deps.db
      .select({
        id: sql<number>`${primaryKey}`.mapWith(Number),
        label: sql<string>`${label}`.mapWith(String),
      })
      .from(table)
      .where(and(...where))
      .orderBy(...orderBy)
      .limit(data.ids.length || 10);

    return response.success({ items });
  });

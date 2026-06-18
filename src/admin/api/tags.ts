import * as z from "zod";
import type { AnyAdminConfig } from "@kenstack/admin/module";
import { tagsSchema } from "@kenstack/zod/tags";
import { tags as tagsTable } from "@kenstack/db/tables/tags";
import { and, count, desc, eq, ilike, notInArray } from "drizzle-orm";
import { deps } from "@app/deps";

import { pipelineStage } from "@kenstack/api";
import { isTagField } from "@kenstack/fields/server";

const schema = z.object({ exclude: tagsSchema, keywords: z.string() });

export const tagsAction = (adminConfig: AnyAdminConfig) =>
  pipelineStage({ access: "admin", schema }, async ({ response, data }) => {
    const { keywords, exclude } = data;
    const excludedSlugs = exclude.map((e) => e.slug);

    const tagRelations = Object.values(adminConfig.fields).find(isTagField)
      ?.behavior.tagRelations;

    if (!tagRelations) {
      return response.error("A tag field handler is required to use tags.");
    }

    const where = [];

    if (keywords) {
      where.push(ilike(tagsTable.name, `%${keywords}%`));
    }

    if (excludedSlugs.length > 0) {
      where.push(notInArray(tagsTable.slug, excludedSlugs));
    }

    const tags = await deps.db
      .select({
        count: count(tagRelations.tagId),
        name: tagsTable.name,
        slug: tagsTable.slug,
      })
      .from(tagRelations)
      .innerJoin(tagsTable, eq(tagRelations.tagId, tagsTable.id))
      .where(where.length > 0 ? and(...where) : undefined)
      .groupBy(tagsTable.id, tagsTable.name, tagsTable.slug)
      .orderBy(desc(count(tagRelations.tagId)), tagsTable.name)
      .limit(10);

    return response.success({
      tags,
    });
  });

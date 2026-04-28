import { tags as tagSchema } from "@kenstack/schemas/atoms";
import * as z from "zod";
import type { AdminApiOptions, AnyAdminTable } from "..";
import { tags as tagsTable } from "@kenstack/db/tables/tags";
import { and, count, desc, eq, ilike, notInArray } from "drizzle-orm";
import { deps } from "@app/deps";

import { pipeline, type PipelineAction } from "@kenstack/lib/api";

const schema = z.object({ exclude: tagSchema(), keywords: z.string() });

const tagSearch = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline({ ...options, schema }, [tagSearchAction(adminTable)]);
};

const tagSearchAction =
  (adminTable: AnyAdminTable): PipelineAction<typeof schema> =>
  async ({ response, data }) => {
    const { keywords, exclude } = data;
    const excludedSlugs = exclude.map((e) => e.slug);

    const tagRelations = adminTable?.tags?.table;

    if (!tagRelations) {
      return response.error(
        "ensure that admin.tags.table is defined tu use tags",
      );
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
  };

export default tagSearch;

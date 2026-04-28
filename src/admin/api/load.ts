import { selectFields } from "..";
import { pipeline, type PipelineAction } from "@kenstack/lib/api";
import { deps } from "@app/deps";
import { eq, asc } from "drizzle-orm";
import { tags as tagsTable } from "@kenstack/db/tables/tags";

import type { AdminApiOptions, AnyAdminTable } from "..";

const load = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline({ ...options }, [loadAction(adminTable)]);
};

const loadAction =
  (adminTable: AnyAdminTable): PipelineAction =>
  async ({ response, id }) => {
    if (!id) {
      return response.error("A valid id is required");
    }

    const { db } = deps;
    const { table, fields } = adminTable;
    const tagRelations = adminTable?.tags?.table;

    const select = selectFields(table, fields);
    const rows = await db.select(select).from(table).where(eq(table.id, id));

    if (!rows.length) {
      return response.error("Unable to find the requested record.");
    }

    const item: Record<string, unknown> = {
      ...adminTable.defaultValues,
      ...rows[0],
    };

    if (tagRelations) {
      item.tags = await db
        .select({
          name: tagsTable.name,
          slug: tagsTable.slug,
        })
        .from(tagRelations)
        .innerJoin(tagsTable, eq(tagRelations.tagId, tagsTable.id))
        .where(eq(tagRelations.tableId, id))
        .orderBy(asc(tagsTable.name));
    }

    return response.success({
      item,
    });
  };

export default load;

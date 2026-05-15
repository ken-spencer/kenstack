import { selectFields } from "./helpers/selectFields";
import { pipeline, pipelineStage } from "@kenstack/lib/api";
import { deps } from "@app/deps";
import { eq, asc } from "drizzle-orm";
import { tags as tagsTable } from "@kenstack/db/tables/tags";
import * as z from "zod";

import type { AdminApiOptions, AnyAdminTable } from "..";
import { loadRelationships } from "./helpers/loadRelationships";
import { loadGalleries } from "./helpers/loadGalleries";

const load = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline(options, [loadAction(adminTable)]);
};

const loadAction = (adminTable: AnyAdminTable) =>
  pipelineStage(
    { role: "admin", schema: z.object({ id: z.number() }) },
    async ({ response, data: { id } }) => {
      if (!id) {
        return response.error("A valid id is required");
      }

      const { db } = deps;
      const { table, fields } = adminTable;
      const tagRelations = adminTable?.tags?.table;

      const select = selectFields(table, fields);

      const rows = await db
        .select({ ...select, deletedAt: table.deletedAt })
        .from(table)
        .where(eq(table.id, id));

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

      Object.assign(
        item,
        await loadRelationships({
          db,
          tableId: id,
          relationships: adminTable.relationships,
        }),
      );

      Object.assign(
        item,
        await loadGalleries({
          db,
          tableId: id,
          galleries: adminTable.galleries,
        }),
      );

      return response.success({
        item,
      });
    },
  );

export default load;

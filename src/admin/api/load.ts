import { selectFields } from "@kenstack/admin/queries/selectFields";
import { pipelineStage } from "@kenstack/api";
import { deps } from "@app/deps";
import { eq, asc } from "drizzle-orm";
import { tags as tagsTable } from "@kenstack/db/tables/tags";
import * as z from "zod";

import type { AnyAdminConfig } from "..";
import { isAdminTableConfig } from "..";
import { loadRelationships } from "./helpers/loadRelationships";
import { loadGalleries } from "./helpers/loadGalleries";

export const loadAction = (adminConfig: AnyAdminConfig) =>
  pipelineStage(
    {
      role: "admin",
      schema: z.object({
        id: z.number().optional(),
        key: z.string().optional(),
      }),
    },
    async ({ response, user, data: { id, key } }) => {
      if (!id && !key) {
        return response.error("A valid id or key is required");
      }

      const { db } = deps;

      const select = selectFields(adminConfig.table, adminConfig.fields);
      let rows = isAdminTableConfig(adminConfig)
        ? !id
          ? null
          : await db
              .select({ ...select, deletedAt: adminConfig.table.deletedAt })
              .from(adminConfig.table)
              .where(eq(adminConfig.table.id, id))
        : key !== adminConfig.key
          ? null
          : await db
              .select(select)
              .from(adminConfig.table)
              .where(eq(adminConfig.table.key, adminConfig.key));

      if (!rows) {
        return response.error(
          adminConfig.single
            ? `Single records can only be loaded with key "${adminConfig.key}".`
            : "A numeric id is required.",
        );
      }

      if (!rows.length && adminConfig.single) {
        rows = await db
          .insert(adminConfig.table)
          .values({
            key: adminConfig.key,
            ...adminConfig.defaultValues,
            createdBy: user.id,
          })
          .onConflictDoNothing({ target: adminConfig.table.key })
          .returning(select);

        if (!rows.length) {
          rows = await db
            .select(select)
            .from(adminConfig.table)
            .where(eq(adminConfig.table.key, adminConfig.key));
        }
      }

      if (!rows.length) {
        return response.error("Unable to find the requested record.");
      }

      const [row] = rows;
      const item: Record<string, unknown> = {
        ...adminConfig.defaultValues,
        ...row,
      };
      const rowId = row.id;

      if (adminConfig.tags?.table) {
        item.tags = await db
          .select({
            name: tagsTable.name,
            slug: tagsTable.slug,
          })
          .from(adminConfig.tags.table)
          .innerJoin(tagsTable, eq(adminConfig.tags.table.tagId, tagsTable.id))
          .where(eq(adminConfig.tags.table.tableId, rowId))
          .orderBy(asc(tagsTable.name));
      }

      Object.assign(
        item,
        await loadRelationships({
          db,
          tableId: rowId,
          relationships: adminConfig.relationships,
        }),
      );

      Object.assign(
        item,
        await loadGalleries({
          db,
          tableId: rowId,
          galleries: adminConfig.galleries,
        }),
      );

      return response.success({
        item,
      });
    },
  );

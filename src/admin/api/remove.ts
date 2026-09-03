import * as z from "zod";
import {
  and,
  getTableColumns,
  getTableName,
  inArray,
  isNotNull,
  isNull,
} from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";
import { adminListCacheTag } from "@kenstack/admin/queries/list";
import { adminLoadCacheTag } from "@kenstack/admin/queries/load";
import { db } from "@app/db";
import { audit } from "@kenstack/logger";
import { revalidator } from "@kenstack/lib/revalidate";

const schema = z.object({
  remove: z.array(z.coerce.number()),
  mode: z.enum(["trash", "restore", "permanent"]).default("trash"),
});

const actionNames = {
  permanent: "delete",
  restore: "restore",
  trash: "soft-delete",
} satisfies Record<z.infer<typeof schema>["mode"], string>;

export const removeAction = ({
  name,
  admin: adminConfig,
}: DefinedAdminModule) =>
  pipelineStage(
    { access: "admin", schema },
    async ({ response, user, data }) => {
      if (!("list" in adminConfig)) {
        return response.error("This admin config is not removable.");
      }

      if (data.remove.length === 0) {
        return response.error("No records provided to delete.");
      }
      const { table } = adminConfig;
      const columns = getTableColumns(table);
      const targetFilter = and(
        inArray(table.id, data.remove),
        data.mode === "trash"
          ? isNull(table.deletedAt)
          : isNotNull(table.deletedAt),
      );
      // Full row is required by field delete hooks and row-based revalidation.
      const rows = await db
        .select({
          ...columns,
          id: table.id,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt,
          ...("slug" in columns ? { slug: columns.slug } : {}),
          ...("title" in columns ? { title: columns.title } : {}),
        })
        .from(table)
        .where(targetFilter);

      if (rows.length !== data.remove.length) {
        return response.error("Unable to find the requested records.");
      }

      if (data.mode === "permanent") {
        const relatedRowsByBinding = [];
        if (adminConfig.oneToOne) {
          const rowIds = rows.map((row) => row.id);
          for (const binding of Object.values(adminConfig.oneToOne.relations)) {
            // Related field delete hooks may inspect any column, so this
            // boundary loads the full rows.
            const relatedRows = await db
              .select(getTableColumns(binding.table))
              .from(binding.table)
              .where(inArray(binding.foreignKey, rowIds));
            relatedRowsByBinding.push({
              binding,
              relatedById: new Map(
                relatedRows.map((relatedRow) => [relatedRow.id, relatedRow]),
              ),
            });
          }
        }

        for (const row of rows) {
          for (const { binding, relatedById } of relatedRowsByBinding) {
            const relatedRow = relatedById.get(row.id);

            if (relatedRow) {
              for (const [fieldKey, field] of Object.entries(binding.fields)) {
                await field.delete?.({
                  db,
                  key: fieldKey,
                  tableId: row.id,
                  row: relatedRow,
                });
              }
            }
          }

          for (const [fieldKey, field] of Object.entries(adminConfig.fields)) {
            await field.delete?.({
              db,
              key: fieldKey,
              tableId: row.id,
              row,
            });
          }
        }

        await db.delete(table).where(targetFilter);
      } else {
        await db
          .update(table)
          .set({ deletedAt: data.mode === "restore" ? null : new Date() })
          .where(targetFilter);
      }

      await audit({
        userId: user.id,
        rowId: rows.length === 1 ? rows[0].id : null,
        table: getTableName(table),
        action: actionNames[data.mode],
        data: {
          records: rows.map((row) => ({
            id: row.id,
            slug: typeof row.slug === "string" ? row.slug : undefined,
            title: typeof row.title === "string" ? row.title : undefined,
          })),
        },
      });

      for (const row of rows) {
        revalidator(adminConfig.revalidate, row);
      }

      rows.forEach((row) => {
        revalidateTag(adminLoadCacheTag(name, row.id), { expire: 0 });
      });
      revalidateTag(adminListCacheTag(name), { expire: 0 });

      return response.success({});
    },
  );

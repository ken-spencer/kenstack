import * as z from "zod";
import { and, getTableName, inArray, isNotNull, isNull } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { pipelineStage } from "@kenstack/api";
import type { DefinedAdmin } from "..";
import { adminListCacheTag } from "@kenstack/admin/queries/list";
import { adminLoadCacheTag } from "@kenstack/admin/queries/load";
import { deps } from "@app/deps";
import { revalidator } from "@kenstack/lib/revalidate";

const schema = z.object({
  remove: z.array(z.coerce.number()),
  mode: z.enum(["trash", "restore", "permanent"]).default("trash"),
});

type RemovedRow = {
  id: number;
} & Record<string, unknown>;

const actionNames = {
  permanent: "delete",
  restore: "restore",
  trash: "soft-delete",
} satisfies Record<z.infer<typeof schema>["mode"], string>;

export const removeAction = ({
  name,
  admin: adminConfig,
}: DefinedAdmin[string]) => {
  if (!adminConfig) {
    return pipelineStage({ access: "admin" }, async ({ response }) =>
      response.error(`Module "${name}" does not have admin records.`),
    );
  }

  return pipelineStage(
    { access: "admin", schema },
    async ({ response, user, data }) => {
      if (!("list" in adminConfig)) {
        return response.error("This admin config is not removable.");
      }

      if (data.remove.length === 0) {
        return response.error("No records provided to delete.");
      }
      const { table } = adminConfig;
      const { db } = deps;
      const tableName = getTableName(table);
      const deletedAtFilter =
        data.mode === "trash"
          ? isNull(table.deletedAt)
          : isNotNull(table.deletedAt);
      const targetFilter = and(inArray(table.id, data.remove), deletedAtFilter);
      const rows = (await db
        .select()
        .from(table)
        .where(targetFilter)) as RemovedRow[];

      if (rows.length !== data.remove.length) {
        return response.error("Unable to find the requested records.");
      }

      if (data.mode === "permanent") {
        for (const row of rows) {
          for (const [fieldKey, field] of Object.entries(adminConfig.fields)) {
            await field.behavior?.delete?.({
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

      await deps.logger.audit({
        userId: user.id,
        rowId: rows.length === 1 ? rows[0].id : null,
        table: tableName,
        action: actionNames[data.mode],
        data: {
          records: rows.map((row) => ({
            id: row.id,
            publicId:
              typeof row.publicId === "string" ? row.publicId : undefined,
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
};

import * as z from "zod";
import { and, getTableName, inArray, isNotNull, isNull } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { pipelineStage } from "@kenstack/lib/api";
import { pipeline } from "@kenstack/lib/api";
import type { AdminApiOptions, AnyAdminTable } from "..";
import { deps } from "@app/deps";

const schema = z.object({
  remove: z.array(z.coerce.number()),
  mode: z.enum(["trash", "restore", "permanent"]).default("trash"),
});

const remove = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline(options, [removeAction(adminTable)]);
};

type RemovedRow = {
  id: number;
} & Record<string, unknown>;

const actionNames = {
  permanent: "delete",
  restore: "restore",
  trash: "soft-delete",
} satisfies Record<z.infer<typeof schema>["mode"], string>;

function impactedRecord(row: RemovedRow) {
  return {
    id: row.id,
    publicId: typeof row.publicId === "string" ? row.publicId : undefined,
    slug: typeof row.slug === "string" ? row.slug : undefined,
    title: typeof row.title === "string" ? row.title : undefined,
  };
}

const removeAction = (adminTable: AnyAdminTable) =>
  pipelineStage({ role: "admin", schema }, async ({ response, user, data }) => {
    if (data.remove.length === 0) {
      return response.error("No records provided to delete.");
    }
    const { table } = adminTable;
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
        records: rows.map(impactedRecord),
      },
    });

    if (adminTable.revalidate) {
      for (const row of rows) {
        adminTable.revalidate.forEach((validator) => {
          if (typeof validator === "string") {
            revalidateTag(validator, "max");
          } else {
            revalidateTag(validator(row), "max");
          }
        });
      }
    }

    return response.success({});
  });

export default remove;

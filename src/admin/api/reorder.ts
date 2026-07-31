import * as z from "zod";
import { and, eq, getTableName, inArray, isNull, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import uniq from "lodash-es/uniq";

import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";
import { adminListCacheTag } from "@kenstack/admin/queries/list";
import { resolveReorderScopeField } from "@kenstack/admin/lib/scopedReorder";
import { deps } from "@app/deps";
import { revalidator } from "@kenstack/lib/revalidate";

const schema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).transform(uniq),
});

const staleListError =
  "The active records no longer match the loaded list. Refresh the list and reorder again.";

export const reorderAction = (moduleConfig: DefinedAdminModule) => {
  const { name, admin: adminConfig } = moduleConfig;

  return pipelineStage(
    { access: "admin", schema },
    async ({ response, user, data }) => {
      if (!("list" in adminConfig)) {
        return response.error("This admin config is not listable.");
      }

      const {
        table,
        list: { reorder },
      } = adminConfig;
      if (!reorder) {
        return response.error("This admin list does not support reorder.");
      }
      const scopeField = resolveReorderScopeField(moduleConfig);

      const reorderError = await deps.db.transaction(async (tx) => {
        let scopeValue: unknown;

        if (scopeField) {
          const submittedRows = await tx
            .select({
              scope: scopeField,
            })
            .from(table)
            .where(and(inArray(table.id, data.ids), isNull(table.deletedAt)));
          if (submittedRows.length !== data.ids.length) {
            return staleListError;
          }
          scopeValue = submittedRows[0]?.scope;
          if (
            scopeValue === undefined ||
            submittedRows.some((row) => row.scope !== scopeValue)
          ) {
            return "Only records from one group can be reordered together. Refresh the list and try again.";
          }

          const activeScopeRows = await tx
            .select({ id: table.id })
            .from(table)
            .where(and(eq(scopeField, scopeValue), isNull(table.deletedAt)));
          const submittedIds = new Set(data.ids);
          if (
            activeScopeRows.length !== submittedIds.size ||
            activeScopeRows.some(({ id }) => !submittedIds.has(id))
          ) {
            return staleListError;
          }
        }

        await tx
          .update(table)
          .set({
            [reorder.fieldKey]: sql`case ${sql.join(
              data.ids.map(
                (id, index) =>
                  sql`when ${table.id} = ${id} then ${(index + 1) * 10}`,
              ),
              sql` `,
            )} else ${reorder.field} end`,
          })
          .where(
            and(
              inArray(table.id, data.ids),
              isNull(table.deletedAt),
              scopeField ? eq(scopeField, scopeValue) : undefined,
            ),
          );

        return null;
      });
      if (reorderError) {
        return response.error(reorderError);
      }

      await deps.logger.audit({
        userId: user.id,
        rowId: null,
        table: getTableName(table),
        action: "reorder",
        data: {
          records: data.ids.map((id) => ({ id })),
        },
      });

      revalidator(adminConfig.revalidate);
      revalidateTag(adminListCacheTag(name), { expire: 0 });

      return response.success({});
    },
  );
};

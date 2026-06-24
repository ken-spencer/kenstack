import * as z from "zod";
import { and, getTableName, inArray, isNull, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import uniq from "lodash-es/uniq";

import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";
import { adminListCacheTag } from "@kenstack/admin/queries/list";
import { deps } from "@app/deps";
import { revalidator } from "@kenstack/lib/revalidate";

const schema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).transform(uniq),
});

export const reorderAction = ({
  name,
  admin: adminConfig,
}: DefinedAdminModule) =>
  pipelineStage(
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

      await deps.db
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
        .where(and(inArray(table.id, data.ids), isNull(table.deletedAt)));

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

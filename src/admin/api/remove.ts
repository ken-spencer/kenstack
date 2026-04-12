import * as z from "zod";
import { inArray } from "drizzle-orm";

import type { PipelineAction } from "@kenstack/lib/api";
import { pipeline } from "@kenstack/lib/api";
import type { AdminApiOptions, AnyAdminTable } from "..";
import { deps } from "@app/deps";

const schema = z.object({
  remove: z.array(z.coerce.number()),
});

const remove = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline({ ...options, schema }, [removeAction(adminTable)]);
};

const removeAction =
  (adminTable: AnyAdminTable): PipelineAction<typeof schema> =>
  async ({ response, data }) => {
    if (data.remove.length === 0) {
      return response.error("No records provided to delete.");
    }
    const { table } = adminTable;
    const { db } = deps;

    await db
      .update(table)
      .set({ deletedAt: new Date() })
      .where(inArray(table.id, data.remove));

    // TODo implement log, potentially look up user in audit?
    // deps.logger.audit({
    //   action: "soft-delete",
    // });
    // if (adminConfig.revalidate) {
    //   await adminConfig.revalidate.onDelete(data.remove);
    // }

    return response.success({});
  };

export default remove;

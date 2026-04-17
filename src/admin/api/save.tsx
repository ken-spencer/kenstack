import { selectFields } from "..";
import { type PipelineAction } from "@kenstack/lib/api";
import { pipeline } from "@kenstack/lib/api";
import type { AdminApiOptions, AnyAdminTable } from "..";
import { eq, getTableName } from "drizzle-orm";

import { deps } from "@app/deps";
import { errorTranslator } from "@kenstack/db/errorTranslator";

const save = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline({ ...options, schema: adminTable.schema }, [
    saveAction(adminTable),
  ]);
};

const saveAction =
  (adminTable: AnyAdminTable): PipelineAction<typeof adminTable.schema> =>
  async ({ response, data, id }) => {
    const { db } = deps;

    const { table, fields } = adminTable;

    const user = await deps.auth.requireUser();
    const select = selectFields(table, fields);

    let rows;
    try {
      rows = id
        ? await db
            .update(table)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(table.id, id))
            .returning(select)
        : await db
            .insert(table)
            .values({
              ...data,
              createdBy: user.id,
            })
            .returning(select);
    } catch (err) {
      const error = errorTranslator(err);
      if (error) {
        return response.json(error);
      }
      throw err;
    }
    const [row] = rows;
    await deps.logger.audit({
      userId: user.id,
      rowId: row.id,
      table: getTableName(table),
      action: id ? "update" : "insert",
    });

    return response.success({
      id: row.id,
      values: row,
    });
  };

export default save;

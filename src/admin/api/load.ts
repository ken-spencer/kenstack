import { selectFields } from "..";
import { pipeline, type PipelineAction } from "@kenstack/lib/api";
import { deps } from "@app/deps";
import { eq } from "drizzle-orm";

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

    const select = selectFields(table, fields);
    const rows = await db.select(select).from(table).where(eq(table.id, id));

    if (!rows.length) {
      return response.error("Unable to find the requested record.");
    }

    return response.success({
      item: {
        ...{ ...adminTable.defaultValues, ...rows[0] },
      },
    });
  };

export default load;

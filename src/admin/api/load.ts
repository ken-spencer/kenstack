import { pipelineStage } from "@kenstack/api";
import { eq } from "drizzle-orm";
import * as z from "zod";

import type { AnyAdminConfig } from "..";
import { loadRecord } from "@kenstack/fields/records";

export const loadAction = (name: string, adminConfig: AnyAdminConfig) =>
  pipelineStage(
    {
      role: "admin",
      schema: z.object({
        id: z.number().optional(),
      }),
    },
    async ({ response, data: { id } }) => {
      const result = await loadRecord({
        table: adminConfig.table,
        fields: adminConfig.fields,
        defaults: adminConfig.defaultValues,
        query: async ({ db, select }) => {
          if (adminConfig.single === true) {
            const [row] = await db
              .select(select)
              .from(adminConfig.table)
              .where(eq(adminConfig.table.key, name));

            return row;
          } else if (id) {
            const [row] = await db
              .select(select)
              .from(adminConfig.table)
              .where(eq(adminConfig.table.id, id));

            return row;
          }
        },
      });

      if (adminConfig.single === false && !result.row) {
        return response.error("Unable to find the requested record.");
      }

      return response.success({
        item: result.values,
      });
    },
  );

import { pipelineStage } from "@kenstack/api";
import type { AnyAdminConfig } from "..";

import * as z from "zod";

import { saveRecord } from "@kenstack/fields/records";

export const saveAction = (name: string, adminConfig: AnyAdminConfig) =>
  pipelineStage(
    {
      role: "admin",
      schema: z.object({
        id: z.number().nullish(),
        changes: z.array(z.string()),
        values: adminConfig.schema,
      }),
      fieldsKey: "values",
    },
    async ({ response, data: rawData }) => {
      const { changes, id, values } = rawData;

      const result =
        adminConfig.single === true
          ? await saveRecord({
              action: id ? "update" : "insert",
              table: adminConfig.table,
              fields: adminConfig.fields,
              values,
              changes: id ? changes : undefined,
              id,
              revalidate: adminConfig.revalidate,
              query: async ({ tx, data, select, user }) => {
                const [row] = await tx
                  .insert(adminConfig.table)
                  .values({
                    key: name,
                    createdBy: user.id,
                    ...data,
                  })
                  .onConflictDoUpdate({
                    target: adminConfig.table.key,
                    set: {
                      ...data,
                      updatedAt: new Date(),
                    },
                  })
                  .returning(select);

                return row;
              },
            })
          : await saveRecord({
              action: id ? "update" : "insert",
              table: adminConfig.table,
              fields: adminConfig.fields,
              values,
              changes: id ? changes : undefined,
              id,
              revalidate: adminConfig.revalidate,
            });

      if (result.status === "error") {
        return response.error(result.error);
      }

      return response.success({
        id: result.row?.id ?? id,
        values: result.values,
      });
    },
  );

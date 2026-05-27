import * as z from "zod";

import { pipelineStage } from "@kenstack/api";
import { loadModuleSettings } from "@kenstack/admin/moduleSettings/queries";
import type { ResolvedModuleSettingsConfig } from "@kenstack/admin";
import { saveRecord } from "@kenstack/fields/records";

export const loadModuleSettingsAction = (
  name: string,
  settings: ResolvedModuleSettingsConfig,
) =>
  pipelineStage({ role: "admin" }, async ({ response }) => {
    return response.success({
      values: await loadModuleSettings(name, settings),
    });
  });

export const saveModuleSettingsAction = (
  name: string,
  settings: ResolvedModuleSettingsConfig,
) =>
  pipelineStage(
    {
      schema: z.object({
        values: settings.schema,
      }),
      role: "admin",
      fieldsKey: "values",
    },
    async ({ response, data }) => {
      const result = await saveRecord({
        action: "save-module-settings",
        table: settings.table,
        fields: settings.fields,
        values: data.values,
        revalidate: ["module-settings:" + name],
        query: async ({ tx, data, select, user }) => {
          const [row] = await tx
            .insert(settings.table)
            .values({
              key: name,
              createdBy: user.id,
              ...data,
            })
            .onConflictDoUpdate({
              target: settings.table.key,
              set: {
                ...data,
                updatedAt: new Date(),
              },
            })
            .returning(select);

          return row;
        },
      });

      if (result.status === "error") {
        return response.error(result.error);
      }

      return response.success({ values: result.values });
    },
  );

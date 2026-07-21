import * as z from "zod";
import { eq } from "drizzle-orm";

import { pipelineStage } from "@kenstack/api";
import type { DefinedAdmin } from "@kenstack/admin/module";
import { loadRecord, saveRecord } from "@kenstack/fields/records";

export const loadModuleSettingsAction = (
  moduleConfig: DefinedAdmin[string],
) => {
  const { name, settings } = moduleConfig;

  if (!settings) {
    return pipelineStage({ access: "admin" }, async ({ response }) =>
      response.error(`Module "${name}" does not have settings.`),
    );
  }

  return pipelineStage({ access: "admin" }, async ({ response }) => {
    const result = await loadRecord({
      table: settings.table,
      fields: settings.fields,
      defaults: settings.defaultValues,
      where: eq(settings.table.key, name),
    });

    return response.success({ values: result.values });
  });
};

export const saveModuleSettingsAction = (
  moduleConfig: DefinedAdmin[string],
) => {
  const { name, settings } = moduleConfig;

  if (!settings) {
    return pipelineStage({ access: "admin" }, async ({ response }) =>
      response.error(`Module "${name}" does not have settings.`),
    );
  }

  return pipelineStage(
    {
      schema: z.object({
        values: settings.schema,
      }),
      access: "admin",
      fieldsKey: "values",
    },
    async ({ response, data }) => {
      const result = await saveRecord({
        actionPrefix: "module-settings",
        admin: true,
        table: settings.table,
        fields: settings.fields,
        values: data.values,
        revalidate: [settings.cacheTag],
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
};

import * as z from "zod";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { pipelineStage } from "@kenstack/api";
import type { ResolvedModuleSettings } from "@kenstack/admin";
import { loadRecord, saveRecord } from "@kenstack/fields/records";

export const loadModuleSettingsAction = (module: {
  name: string;
  settings: ResolvedModuleSettings;
}) =>
  pipelineStage({ role: "admin" }, async ({ response }) => {
    const { name, settings } = module;

    return response.success({
      values: await loadModuleSettings(name, settings),
    });
  });

async function loadModuleSettings(name: string, settings: ResolvedModuleSettings) {
  "use cache";
  cacheTag(settings.cacheTag);
  cacheLife("max");

  const result = await loadRecord({
    table: settings.table,
    fields: settings.fields,
    defaults: settings.defaultValues,
    query: async ({ db, select }) => {
      const [row] = await db
        .select(select)
        .from(settings.table)
        .where(eq(settings.table.key, name))
        .limit(1);

      return row;
    },
  });

  return result.values;
}

export const saveModuleSettingsAction = (
  name: string,
  settings: ResolvedModuleSettings,
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

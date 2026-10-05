import * as z from "zod";
import { eq } from "drizzle-orm";

import { pipelineStage } from "@kenstack/api";
import type { DefinedAdmin } from "@kenstack/admin/module";
import { loadRecord, saveRecord } from "@kenstack/records";

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
    const values = await loadRecord({
      table: settings.table,
      fields: settings.fields,
      where: eq(settings.table.key, name),
    });

    // The row and token the editor sends back with each save. Null before the first save.
    return response.success({
      values: values ?? settings.defaultValues,
      id: values?.id ?? null,
      updatedAt: values?.updatedAt ?? null,
    });
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
        id: z.int().positive().nullable(),
        updatedAt: z.iso
          .datetime()
          .transform((value) => new Date(value))
          .nullable(),
        changes: z.array(z.string()),
        values: settings.schema,
      }),
      access: "admin",
      fieldsKey: "values",
    },
    async ({ response, data }) => {
      const { id } = data;
      const result = await saveRecord({
        actionPrefix: "module-settings",
        admin: true,
        table: settings.table,
        fields: settings.fields,
        values: data.values,
        // The first save inserts the full row, since Postgres checks NOT NULL on the proposed row.
        changes: id ? data.changes : undefined,
        id,
        updatedAt: data.updatedAt,
        revalidate: [settings.cacheTag],
        // One that finds the row already created by someone else inserts nothing and refuses.
        query: id
          ? undefined
          : async ({ tx, data, select, user }) => {
              const [row] = await tx
                .insert(settings.table)
                .values({
                  key: name,
                  createdBy: user.id,
                  ...data,
                })
                .onConflictDoNothing({ target: settings.table.key })
                .returning(select);

              return row;
            },
      });

      if (result.status === "error") {
        return response.error(result.error);
      }

      return response.success({
        values: result.values,
        id: result.row?.id ?? id,
        updatedAt: result.updatedAt,
      });
    },
  );
};

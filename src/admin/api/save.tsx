import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";

import * as z from "zod";

import { saveAdminRecord } from "@kenstack/admin/queries/save";

function withServerPublishDate<
  TData extends { changes: string[]; values: Record<string, unknown> },
>(data: TData) {
  const { values } = data;

  if (
    !Object.hasOwn(values, "visibility") ||
    !Object.hasOwn(values, "publishedAt")
  ) {
    return data;
  }

  if (values.visibility !== "published" && values.visibility !== "unlisted") {
    return data;
  }

  if (values.publishedAt) {
    return data;
  }

  return {
    ...data,
    changes: data.changes.includes("publishedAt")
      ? data.changes
      : [...data.changes, "publishedAt"],
    values: {
      ...values,
      publishedAt: new Date(),
    },
  };
}

export const saveAction = (moduleConfig: DefinedAdminModule) => {
  const { admin: adminConfig } = moduleConfig;

  return pipelineStage(
    {
      access: "admin",
      schema: z.object({
        id: z.number().nullish(),
        changes: z.array(z.string()),
        parentId: z.number().int().positive().optional(),
        values: adminConfig.schema,
      }),
      fieldsKey: "values",
    },
    async ({ response, data: rawData }) => {
      const { parent } = moduleConfig;
      const rawSaveData = withServerPublishDate(rawData);
      const { id } = rawSaveData;
      const { changes } = rawSaveData;
      let { values } = rawSaveData;

      if (!id && parent) {
        if (!rawSaveData.parentId) {
          return response.error("Parent ID is missing.");
        }

        values = {
          ...values,
          [parent.foreignKey]: rawSaveData.parentId,
        };
      }

      const result = await saveAdminRecord({
        changes,
        id,
        module: moduleConfig,
        values,
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
};

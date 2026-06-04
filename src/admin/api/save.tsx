import { pipelineStage } from "@kenstack/api";
import type { DefinedAdmin } from "..";

import * as z from "zod";

import { saveAdminRecord } from "@kenstack/admin/queries/save";

export const saveAction = (moduleConfig: DefinedAdmin[string]) => {
  const { name, admin: adminConfig } = moduleConfig;

  if (!adminConfig) {
    return pipelineStage({ access: "admin" }, async ({ response }) =>
      response.error(`Module "${name}" does not have admin records.`),
    );
  }

  return pipelineStage(
    {
      access: "admin",
      schema: z.object({
        id: z.number().nullish(),
        changes: z.array(z.string()),
        values: adminConfig.schema,
      }),
      fieldsKey: "values",
    },
    async ({ response, data: rawData }) => {
      const { changes, id, values } = rawData;

      const result = await saveAdminRecord({
        changes,
        id,
        moduleConfig,
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

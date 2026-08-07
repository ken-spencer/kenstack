import * as z from "zod";

import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";
import { loadOneToOne } from "@kenstack/admin/queries/load";

// Builds the authorized action that validates and loads one configured relation for the admin
// editor.
export const loadOneToOneAction = (moduleConfig: DefinedAdminModule) =>
  pipelineStage(
    {
      access: "admin",
      schema: z.object({
        parentId: z.int().positive(),
        relationKey: z.string().min(1).max(200),
      }),
    },
    async ({ response, data }) => {
      const oneToOne = moduleConfig.admin.oneToOne;
      if (!oneToOne || !oneToOne.relations[data.relationKey]) {
        return response.error(
          `Unknown one-to-one relation "${data.relationKey}" for this admin table.`,
        );
      }

      return response.success({
        item: await loadOneToOne({
          name: moduleConfig.name,
          parentId: data.parentId,
          relationKey: data.relationKey,
        }),
      });
    },
  );

import * as z from "zod";

import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";
import { loadAdminListNeighbors } from "@kenstack/admin/queries/list";

const schema = z.object({
  id: z.coerce.number().int().positive(),
  parentId: z.coerce.number().int().positive().optional(),
  query: z.string().max(5000).optional().catch(""),
});

export const neighborsAction = ({
  admin: adminConfig,
  parent,
}: DefinedAdminModule) =>
  pipelineStage(
    {
      access: "admin",
      schema,
    },
    async ({ response, data }) => {
      if (!("list" in adminConfig)) {
        return response.error("This admin config is not listable.");
      }

      if ((parent && !data.parentId) || (!parent && data.parentId)) {
        return response.error("Parent ID is missing.");
      }

      const result = await loadAdminListNeighbors({
        adminConfig,
        id: data.id,
        moduleParent: parent,
        parentId: data.parentId,
        queryString: data.query ?? "",
      });

      return response.success({
        previousId: result.previousId,
        nextId: result.nextId,
      });
    },
  );

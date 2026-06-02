import * as z from "zod";

import { pipelineStage } from "@kenstack/api";
import type { AnyAdminConfig } from "@kenstack/admin";
import { loadAdminListNeighbors } from "@kenstack/admin/queries/list";

const schema = z.object({
  id: z.coerce.number().int().positive(),
  query: z.string().max(5000).optional().catch(""),
});

export const neighborsAction = (adminConfig: AnyAdminConfig) =>
  pipelineStage(
    {
      role: "admin",
      schema,
    },
    async ({ response, data }) => {
      if (!("list" in adminConfig)) {
        return response.error("This admin config is not listable.");
      }

      const result = await loadAdminListNeighbors(
        adminConfig,
        data.query ?? "",
        data.id,
      );

      return response.success({
        previousId: result.previousId,
        nextId: result.nextId,
      });
    },
  );

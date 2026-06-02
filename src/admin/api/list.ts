import { pipelineStage } from "@kenstack/api";
import type { AnyAdminConfig } from "@kenstack/admin";
import { createListRequestSchema } from "@kenstack/admin/lib/listQuerySchema";
import { queryAdminList } from "@kenstack/admin/queries/list";

export const listAction = (adminConfig: AnyAdminConfig) =>
  pipelineStage(
    {
      role: "admin",
      schema: createListRequestSchema({
        filters: "list" in adminConfig ? adminConfig.list.filters : {},
        sort: "list" in adminConfig ? adminConfig.list.sort : {},
      }),
    },
    async ({ response, data }) => {
      if (!("list" in adminConfig)) {
        return response.error("This admin config is not listable.");
      }

      const result = await queryAdminList(adminConfig, data);

      if (result.status === "error") {
        return response.error(result.message);
      }

      return response.success({
        total: result.total,
        items: result.items,
      });
    },
  );

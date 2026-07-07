import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";
import { createListRequestSchema } from "@kenstack/list/querySchema";
import { queryAdminList } from "@kenstack/admin/queries/list";

export const listAction = ({
  admin: adminConfig,
  parent,
}: DefinedAdminModule) =>
  pipelineStage(
    {
      access: "admin",
      schema: createListRequestSchema({
        filters: "list" in adminConfig ? adminConfig.list.filters : {},
        sort: "list" in adminConfig ? adminConfig.list.sort : {},
      }),
    },
    async ({ response, data }) => {
      if (!("list" in adminConfig)) {
        return response.error("This module is not listable.");
      }

      if ((parent && !data.parentId) || (!parent && data.parentId)) {
        return response.error("Parent ID is missing.");
      }

      const result = await queryAdminList({
        adminConfig,
        moduleParent: parent,
        parentId: data.parentId,
        query: data,
      });

      if (result.status === "error") {
        return response.error(result.message);
      }

      return response.success({
        total: result.total,
        items: result.items,
      });
    },
  );

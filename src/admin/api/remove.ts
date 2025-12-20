import { objectId } from "@kenstack/schemas/atoms";
import * as z from "zod";

import type { PipelineAction } from "@kenstack/lib/api";
import { pipeline } from "@kenstack/lib/api";
import { type AdminServerConfig } from "../types";

const schema = z.object({
  remove: z.array(objectId("server")),
});

const remove = (request, adminConfig: AdminServerConfig) => {
  return pipeline(request, schema, [removeAction(adminConfig)]);
};

const removeAction =
  (adminConfig: AdminServerConfig): PipelineAction<typeof schema> =>
  async ({ response, data }) => {
    // const result = schema.safeParse(data);
    // if (!result.success) {
    //   return response.error("A valid id is required ");
    // }

    if (data.remove.length === 0) {
      return response.error("No records provided to delete.");
    }

    await adminConfig.model.updateMany(
      { _id: { $in: data.remove } },
      {
        $set: {
          "meta.deleted": true,
          "meta.updatedAt": new Date(),
        },
      }
    );
    if (adminConfig.revalidate) {
      await adminConfig.revalidate.onDelete(data.remove);
    }

    return response.success({});
  };

export default remove;

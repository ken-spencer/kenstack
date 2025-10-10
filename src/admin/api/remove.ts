import { getDb } from "@kenstack/lib/db";
import { revalidatePath } from "next/cache";

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
  (adminConfig): PipelineAction<typeof schema> =>
  async ({ response, data }) => {
    // const result = schema.safeParse(data);
    // if (!result.success) {
    //   return response.error("A valid id is required ");
    // }

    if (data.remove.length === 0) {
      return response.error("No records provided to delete.");
    }

    const db = await getDb();
    await db.collection(adminConfig.collection).updateMany(
      { _id: { $in: data.remove } },
      {
        $set: {
          "meta.deleted": true,
          "meta.updatedAt": new Date(),
        },
      }
    );

    if (
      Array.isArray(adminConfig.revalidate) &&
      adminConfig.revalidate.length
    ) {
      const docs = await db
        .collection(adminConfig.collection)
        .find({ _id: { $in: data.remove } })
        .toArray();

      docs.forEach((doc) => {
        adminConfig.revalidate.forEach((arg) => {
          if (typeof arg === "function") {
            revalidatePath(arg({ id: doc._id.toHexString(), ...doc }));
          } else {
            revalidatePath(arg);
          }
        });
      });
    }

    return response.success({});
  };

export default remove;

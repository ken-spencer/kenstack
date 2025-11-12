import { getDb } from "@kenstack/lib/db";
import errorLog from "@kenstack/lib/errorLog";

import { getClaims } from "@kenstack/lib/auth";
import { pipeline, type PipelineAction } from "@kenstack/lib/api";
import { type AdminServerConfig } from "../types";

import getEditAggregations from "./getEditAggregations";

const load = (request, adminConfig: AdminServerConfig) => {
  return pipeline(request, null, [loadAction(adminConfig)]);
};

const loadAction =
  (adminConfig: AdminServerConfig): PipelineAction =>
  async ({ response, id }) => {
    if (!id) {
      return response.error("A valid id is required");
    }

    // const clientSchema =
    //   typeof adminConfig.schema === "function"
    //     ? adminConfig.schema("client")
    //     : adminConfig.schema;

    // const projection = {
    //   ...Object.keys(clientSchema.shape).reduce((acc, k) => {
    //     acc[k] = true;
    //     return acc;
    //   }, {}),
    //   meta: true,
    // };

    // const aggregations = adminConfig.edit?.aggregate
    //   ? adminConfig.edit.aggregate({ projection })
    //   : [
    //       {
    //         $project: projection,
    //       },
    //     ];

    const aggregations = getEditAggregations(adminConfig);
    const db = await getDb();
    let doc;
    try {
      doc = await db
        .collection(adminConfig.collection)
        .aggregate([
          { $match: { _id: id, "meta.deleted": false } },
          ...aggregations,
        ])
        .next();
    } catch (e) {
      if (e.errorResponse?.errmsg) {
        errorLog(e, "Query error: " + e.errorResponse?.errmsg);
        return response.error(
          "There was an unexpected problem quierying the record"
        );
      } else {
        throw e;
      }
    }

    if (!doc) {
      return response.error(
        "Unable to find the requested document. Was it deleted?"
      );
    }

    const claims = await getClaims();
    return response.success({
      userId: claims ? claims.sub : null,
      item: {
        ...{ ...adminConfig.defaultValues, ...doc },
        // meta: {
        //   createdAt: doc.meta.createdAt.toString(),
        //   updatedAt: doc.meta.updatedAt.toString(),
        // },
      },
    });
  };

export default load;

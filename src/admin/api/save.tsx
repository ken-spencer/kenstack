import { ObjectId } from "mongodb";
import getEditAggregations from "./getEditAggregations";

import { getClaims } from "@kenstack/lib/auth";

import { type PipelineAction, saveErrorResponse } from "@kenstack/lib/api";
import { pipeline } from "@kenstack/lib/api";
import { type AdminServerConfig } from "../types";

const save = (request, adminConfig: AdminServerConfig) => {
  return pipeline(request, adminConfig.schema, [saveAction(adminConfig)]);
};

const saveAction =
  (adminConfig: AdminServerConfig): PipelineAction =>
  async ({ response, data, dataIn: { isNew }, id }) => {
    if (!id && isNew !== true) {
      return response.error("Invalid save request.");
    }
    if (isNew) {
      id = new ObjectId();
    }

    // const db = await getDb();
    const claims = await getClaims();
    if (claims === false) {
      return response.error("Authentication error");
    }

    const now = new Date();
    let saveOk = false; // true if insert acknowledged or an update matched
    // let originalDoc;
    try {
      if (isNew) {
        const insertRes = await adminConfig.model.insertOne({
          _id: id,
          ...data,
          meta: {
            createdAt: now,
            updatedAt: now,
            createdBy: new ObjectId(claims.sub),
            deleted: false,
          },
        });
        saveOk = !!(insertRes.acknowledged && insertRes.insertedId);
        if (adminConfig.revalidate) {
          adminConfig.revalidate.onCreate();
        }
      } else {
        if (adminConfig.revalidate) {
          await adminConfig.revalidate.onUpdate(id, data);
        }

        const updateRes = await adminConfig.model.updateOne(
          { _id: id },
          {
            $set: {
              ...data,
              "meta.updatedAt": now,
            },
          }
        );

        saveOk = !!(updateRes.acknowledged && updateRes.matchedCount > 0);
      }
    } catch (err) {
      return saveErrorResponse(response, err);
      // if (err.code === 11000 && err.keyPattern) {
      //   const fieldErrors: Record<string, string[]> = {};
      //   for (const key in err.keyPattern) {
      //     fieldErrors[key] = ["Another record with this value already exists."];
      //   }
      //   return response.final({
      //     status: "error",
      //     fieldErrors,
      //   });
      // }

      // // eslint-disable-next-line no-console
      // console.error("Unexpected error during save:", err);
      // return response.error("Unexpected error during save.");
    }

    if (!saveOk) {
      return response.error("There wasa problem saving this request.");
    }

    const aggregations = getEditAggregations(adminConfig);
    const doc = await adminConfig.model
      .aggregate([
        { $match: { _id: id, "meta.deleted": false } },
        ...aggregations,
      ])
      .next();

    // const clientSchema =
    //   typeof adminConfig.schema === "function"
    //     ? adminConfig.schema("client")
    //     : adminConfig.schema;
    // const retval = clientSchema.parse(doc) as Record<string, unknown>;

    return response.success({
      id: doc._id.toHexString(),
      values: doc,
      // values: {
      //   ...doc,
      //   meta: {
      //     createdAt: resultDoc.meta.createdAt.toString(),
      //     updatedAt: resultDoc.meta.updatedAt.toString(),
      //   },
      // },
    });
  };

export default save;

import { ObjectId } from "mongodb";
import { getDb } from "@kenstack/lib/db";
import getEditAggregations from "./getEditAggregations";
import { revalidatePath } from "next/cache";

import { getClaims } from "@kenstack/lib/auth";

import type { PipelineAction } from "@kenstack/lib/api";
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

    const db = await getDb();
    const claims = await getClaims();
    if (claims === false) {
      return response.error("Authentication error");
    }

    const now = new Date();
    let saveOk = false; // true if insert acknowledged or an update matched
    try {
      if (isNew) {
        const insertRes = await db
          .collection(adminConfig.collection)
          .insertOne({
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
      } else {
        const updateRes = await db.collection(adminConfig.collection).updateOne(
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
      if (err.code === 11000 && err.keyPattern) {
        const fieldErrors: Record<string, string[]> = {};
        for (const key in err.keyPattern) {
          fieldErrors[key] = ["Another record with this value already exists."];
        }
        return response.final({
          status: "error",
          fieldErrors,
        });
      }

      // eslint-disable-next-line no-console
      console.error("Unexpected error during save:", err);
      return response.error("Unexpected error during save.");
    }

    if (!saveOk) {
      return response.error("There wasa problem saving this request.");
    }

    const aggregations = getEditAggregations(adminConfig);
    const doc = await db
      .collection(adminConfig.collection)
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

    if (Array.isArray(adminConfig.revalidate)) {
      adminConfig.revalidate.forEach((arg) => {
        if (typeof arg === "function") {
          revalidatePath(arg({ id: doc._id.toHexString(), ...doc }));
        } else {
          revalidatePath(arg);
        }
      });
    }

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

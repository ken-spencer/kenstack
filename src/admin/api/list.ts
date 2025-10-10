import { ServerEvents /*Sort*/ } from "mongodb";
import * as z from "zod";

import { getDb } from "@kenstack/lib/db";
// import { ObjectId } from "mongodb";

import type { PipelineAction } from "@kenstack/lib/api";
import { pipeline } from "@kenstack/lib/api";
import { type AdminServerConfig } from "../types";

const querySchema = z.object({
  keywords: z.string(),
  page: z.number().default(1),
});

const list = (request, adminConfig: AdminServerConfig) => {
  const schema = adminConfig.filters?.schema
    ? querySchema.extend({ filters: adminConfig.filters.schema })
    : querySchema;
  return pipeline(request, schema, [listAction(adminConfig)]);
};

const listAction =
  (adminConfig): PipelineAction<typeof querySchema> =>
  async ({ response, data }) => {
    const { keywords, page } = data;
    const limit = adminConfig.list.limit || 25;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { "meta.deleted": { $ne: true } };

    if (keywords) {
      const kf = getKeywordFields(adminConfig.schema);
      if (kf.length) {
        filter.$or = kf.map((field) => {
          return {
            [field]: { $regex: escapeRegex(keywords), $options: "i" },
          };
        });
      }
    }
    type EntityServer = z.infer<typeof adminConfig.schemaServer>;

    const aggregations = adminConfig.list?.aggregate
      ? adminConfig.list.aggregate({ data })
      : [];

    const db = await getDb();

    const [res] = await db
      .collection<ServerEvents>(adminConfig.collection)
      .aggregate<{
        metadata: { total: number }[];
        data: EntityServer[];
      }>([
        { $match: filter },
        ...aggregations,
        { $sort: adminConfig.list.sort ?? { _id: 1 } },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $skip: skip },
              { $limit: limit },
              { $project: { meta: 1, ...adminConfig.list.select } },
            ],
          },
        },
      ])
      .toArray();

    const total = res.metadata[0]?.total ?? 0;

    // const clientSchema =
    //   typeof adminConfig.schema === "function"
    //     ? adminConfig.schema("client")
    //     : adminConfig.schema;
    // const resultSchema = clientSchema.pick(adminConfig.list.select);
    const items = res.data.map((doc) => ({
      id: doc._id.toHexString(),
      ...doc,
      meta: {
        createdAt: doc.meta.createdAt.toString(),
        updatedAt: doc.meta.updatedAt.toString(),
      },
    }));

    return response.success({ total, items });
  };

import { type SchemaFactory } from "@kenstack/schemas";

export function getKeywordFields(
  schemaOrFunction: z.ZodObject | SchemaFactory
): ReadonlyArray<string> {
  const schema =
    typeof schemaOrFunction === "function"
      ? schemaOrFunction("server")
      : schemaOrFunction;

  const out: string[] = [];
  for (const [key, field] of Object.entries(schema.shape)) {
    if (field instanceof z.ZodString) {
      out.push(String(key));
      continue;
    }

    if (field instanceof z.ZodEnum) {
      out.push(String(key));
      continue;
    }

    if (field instanceof z.ZodArray) {
      const elementType = field.element;
      if (elementType instanceof z.ZodString) {
        out.push(String(key));
        continue;
      }
    }
  }

  return out;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default list;

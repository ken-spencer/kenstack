import type { Document } from "mongodb";

import { getDb } from "@kenstack/lib/db";

import { tags as tagSchema } from "@kenstack/schemas/atoms";
import * as z from "zod";
// import { adminConfig } from "@/config/client";

import { pipeline, type PipelineAction } from "@kenstack/lib/api";
import { type AdminServerConfig } from "../types";

const schema = z.object({ exclude: tagSchema(), keywords: z.string() });
const responseSchema = z.array(
  z.object({
    count: z.number(),
    name: z.string(),
    slug: z.string(),
  })
);

const tagSearch = (request, adminConfig: AdminServerConfig) => {
  return pipeline(request, schema, [tagSearchAction(adminConfig)]);
};

const tagSearchAction =
  (adminConfig): PipelineAction<typeof schema> =>
  async ({ response, data }) => {
    const field = "tags";

    // const parsed = schema.safeParse(data);

    // if (!parsed.success) {
    //   return response.error("Invalid data received");
    // }
    const { keywords, exclude } = data;

    const pipeline: Document[] = [
      { $unwind: `$${field}` },
      { $match: { [field + ".name"]: { $exists: true, $ne: "" } } },
    ];

    const excludedSlugs = exclude.map((e) => e.slug);

    if (excludedSlugs.length) {
      pipeline.push({ $match: { [field + ".slug"]: { $nin: excludedSlugs } } });
    }

    if (keywords) {
      pipeline.push({
        $match: { [field + ".name"]: { $regex: keywords, $options: "i" } },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: { name: `$${field}.name`, slug: `$${field}.slug` },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
      { $project: { name: "$_id.name", slug: "$_id.slug", count: 1, _id: 0 } }
    );

    const db = await getDb();
    const result = await db
      .collection(adminConfig.collection)
      .aggregate(pipeline)
      .toArray();

    return response.success({
      // tags: result ? result.map(({ tag }) => sentenceCase(tag)) : [],
      tags: responseSchema.parse(result),
      // tags: [],
    });
  };

export default tagSearch;

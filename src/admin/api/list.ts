import * as z from "zod";
import { sql, desc, isNull, and, or, ilike } from "drizzle-orm";

import { pipeline, type PipelineAction } from "@kenstack/lib/api";
import type { AdminApiOptions, AnyAdminTable } from "@kenstack/admin";

const querySchema = z.object({
  keywords: z.string(),
  page: z.number().default(1),
});

import { deps } from "@app/deps";

const list = ({ adminTable, ...options }: AdminApiOptions) => {
  const schema = adminTable.filters?.schema
    ? querySchema.extend({ filters: adminTable.filters.schema })
    : querySchema;
  return pipeline({ ...options, schema }, [listAction(adminTable)]);
};

const listAction =
  (adminTable: AnyAdminTable): PipelineAction<typeof querySchema> =>
  async ({ response, data }) => {
    const { keywords, page } = data;
    const limit = adminTable.limit || 25;
    const offset = (page - 1) * limit;

    const { db } = deps;
    const { table, fields, orderBy } = adminTable;

    const searchable = Object.entries(fields)
      .filter(([, field]) => "searchable" in field && field.searchable)
      .map(([key]) => key);

    const where = [isNull(table.deletedAt)];

    const keyword = keywords.trim();
    if (keyword && searchable.length) {
      // const searchableColumns = searchable.map(
      //   (key) => table[key as keyof typeof table],
      // );

      const keyword = keywords.trim();
      if (keyword && searchable.length) {
        const searchableColumns = searchable
          .filter(
            (key): key is Extract<keyof typeof table, string> => key in table,
          )
          .map((key) => table[key]);

        // if (keyword.length >= 2) {
        // where.push(
        //   sql<boolean>`to_tsvector('english', concat_ws(' ', ${sql.join(searchableColumns, sql`, `)})) @@ websearch_to_tsquery('english', ${keyword})`,
        // );
        // } else {
        const searchConditions = searchableColumns.map((column) => {
          return ilike(sql`${column}`, `%${keyword}%`);
        });

        where.push(or(...searchConditions)!);
        // }
      }
    }

    const rows = await db
      .select({
        id: table.id,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        ...adminTable.select,
      })
      .from(table)
      .where(and(...where))
      .orderBy(...(orderBy ? orderBy : [desc(table.id)]))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(table)
      .where(and(...where));

    return response.success({ total: count, items: rows });

    /*
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
    // type EntityServer = z.infer<typeof adminConfig.schemaServer>;

    const aggregations = adminConfig.list?.aggregate
      ? adminConfig.list.aggregate({ data })
      : [];

    // const db = await getDb();

    // const [res] = await db
    //   .collection<ServerEvents>(adminConfig.collection)
    //   .aggregate<{
    const [res] = await adminConfig.model
      .aggregate<{
        metadata: { total: number }[];
        data: WithMeta<WithId<Record<string, unknown>>>[];
        // data: EntityServer[];
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
    */
  };

import { type SchemaFactory } from "@kenstack/schemas";

export function getKeywordFields(
  schemaOrFunction: z.ZodObject | SchemaFactory,
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

// function escapeRegex(str: string): string {
//   return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

export default list;

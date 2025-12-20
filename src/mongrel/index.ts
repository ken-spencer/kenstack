import * as z from "zod";
import { ObjectId } from "mongodb";
import { getCollection } from "@kenstack/lib/db";
import { getClaims } from "@kenstack/lib/auth";
import { type SchemaFactory } from "@kenstack/schemas";
import MongrelAggregationCursor from "./AggregationCursor";

import type {
  Document,
  Filter,
  AggregateOptions,
  UpdateFilter,
  WithId,
  OptionalUnlessRequiredId,
  OptionalId,
  FindOneAndUpdateOptions,
  UpdateOptions,
  UpdateResult,
  ModifyResult,
  InsertOneResult,
  FindOptions,
  BulkWriteOptions,
  AnyBulkWriteOperation,
  BulkWriteResult,
  // ReplaceOneModel,
} from "mongodb";

export type Meta = {
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId | null;
  deleted: boolean;
};

export type WithMeta<TSchema> = TSchema & { _id?: ObjectId; meta: Meta };

type Options<TSchema> = {
  defaultValues?: TSchema;
};

type ProjectionShape<TSchema extends Document> = Partial<
  Record<keyof WithId<TSchema>, 0 | false | 1 | true>
>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type IdExcluded<T> = "_id" extends keyof T
  ? T["_id"] extends 0 | false
    ? true
    : false
  : false;

type InferFindOneResult<TSchema extends Document, TResult> =
  TResult extends ProjectionShape<TSchema>
    ? Prettify<
        IdExcluded<TResult> extends true
          ? Pick<TSchema, Extract<keyof TSchema, keyof TResult>>
          : WithId<Pick<TSchema, Extract<keyof TSchema, keyof TResult>>>
      >
    : WithId<TResult>;

class MongrelImpl<TSchema extends Document> {
  declare readonly Schema: TSchema;
  declare readonly Projection: ProjectionShape<TSchema>;
  readonly defaultValues: TSchema;

  constructor(
    readonly collectionName: string,
    readonly schema: z.ZodObject,
    { defaultValues = null }: Options<TSchema> = {}
  ) {
    this.defaultValues = defaultValues;
  }

  async getCollection() {
    return await getCollection<WithMeta<TSchema>>(this.collectionName);
  }

  /** ensure $set.meta.updatedAt is typed, no dotted paths */
  private withTouchedMeta(
    update: UpdateFilter<WithMeta<TSchema>>
  ): UpdateFilter<WithMeta<TSchema>> {
    const existingSet = (update.$set ?? {}) as Partial<WithMeta<TSchema>>;

    const finalSet: Partial<WithMeta<TSchema>> = {
      ...existingSet,
      "meta.updatedAt": new Date(),
    };

    return {
      ...update,
      $set: finalSet,
    };
  }

  /** find */
  async find<TResult extends Document = TSchema>(
    filter: Filter<WithMeta<TSchema>> = {},
    options?: FindOptions
  ): Promise<TResult[]> {
    const collection = await this.getCollection();

    const finalFilter = {
      "meta.deleted": false,
      ...filter,
    };

    const cursor = collection.find<TResult>(finalFilter, options);

    return cursor.toArray();
  }

  /** findOne */
  async findOne<
    TResult extends ProjectionShape<TSchema> | Partial<WithId<TSchema>>,
  >(
    filter: Filter<WithMeta<TSchema>> = {},
    options?: FindOptions
  ): Promise<InferFindOneResult<TSchema, TResult> | null> {
    const collection = await this.getCollection();

    const finalFilter = {
      "meta.deleted": false,
      ...filter,
    };

    return await collection.findOne<InferFindOneResult<TSchema, TResult>>(
      finalFilter,
      options
    );
  }

  /** aggregate */
  aggregate<TResult extends Document = Document>(
    pipeline: Document[],
    options?: AggregateOptions
  ): MongrelAggregationCursor<TResult> {
    return new MongrelAggregationCursor<TResult>(
      this.collectionName,
      pipeline,
      options
    );
  }

  /** insertOne */
  async insertOne(
    insert: OptionalUnlessRequiredId<Partial<TSchema>>
  ): Promise<InsertOneResult<WithMeta<TSchema>>> {
    const collection = await this.getCollection();

    const claims = await getClaims();
    const meta: Meta = {
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy:
        claims !== false && claims.sub ? new ObjectId(claims.sub) : null,
      deleted: false,
    };

    const defaults = defaultsFromSchema(this.schema);
    const documentWithMeta = {
      ...defaults,
      ...insert,
      meta,
    } as unknown as OptionalUnlessRequiredId<WithMeta<TSchema>>;

    const retval = await collection.insertOne(documentWithMeta);
    return retval;
  }

  /** bulkWrite */
  async bulkWrite(
    ops: (
      | { insertOne: { document: OptionalUnlessRequiredId<TSchema> } }
      | {
          updateOne: {
            filter: Filter<WithMeta<TSchema>>;
            update: UpdateFilter<WithMeta<TSchema>>;
            upsert?: boolean;
          };
        }
      | {
          updateMany: {
            filter: Filter<WithMeta<TSchema>>;
            update: UpdateFilter<WithMeta<TSchema>>;
            upsert?: boolean;
          };
        }
      | { deleteOne: { filter: Filter<WithMeta<TSchema>> } }
      | { deleteMany: { filter: Filter<WithMeta<TSchema>> } }
    )[],
    // Intentionally exclude replaceOne: full replacement not supported
    options?: BulkWriteOptions
  ): Promise<BulkWriteResult> {
    const collection = await this.getCollection();

    const claims = await getClaims();
    const createdBy =
      claims !== false && claims.sub ? new ObjectId(claims.sub) : null;

    const now = new Date();

    const finalOps: AnyBulkWriteOperation<WithMeta<TSchema>>[] = ops.map(
      (op) => {
        if ("insertOne" in op) {
          const doc = op.insertOne
            .document as OptionalUnlessRequiredId<TSchema>;
          const withMeta = {
            ...(doc as object),
            meta: {
              createdAt: now,
              updatedAt: now,
              createdBy,
              deleted: false,
            },
          } as OptionalId<WithMeta<TSchema>>;
          return { insertOne: { document: withMeta } };
        }

        if ("updateOne" in op) {
          const { filter, update, upsert } = op.updateOne;
          if (!update || typeof update !== "object" || Array.isArray(update)) {
            throw new TypeError(
              "bulkWrite.updateOne: 'update' must be an object with operators"
            );
          }
          if (!Object.keys(update).some((k) => k.startsWith("$"))) {
            throw new Error(
              "Full document replacement is not supported (updateOne)"
            );
          }
          const finalUpdate = this.withTouchedMeta(
            update as UpdateFilter<WithMeta<TSchema>>
          );
          return { updateOne: { filter, update: finalUpdate, upsert } };
        }

        if ("updateMany" in op) {
          const { filter, update, upsert } = op.updateMany;
          if (!update || typeof update !== "object" || Array.isArray(update)) {
            throw new TypeError(
              "bulkWrite.updateMany: 'update' must be an object with operators"
            );
          }
          if (!Object.keys(update).some((k) => k.startsWith("$"))) {
            throw new Error(
              "Full document replacement is not supported (updateMany)"
            );
          }

          const finalUpdate = this.withTouchedMeta(
            update as UpdateFilter<WithMeta<TSchema>>
          );
          return { updateMany: { filter, update: finalUpdate, upsert } };
        }

        if ("deleteOne" in op) {
          return op as AnyBulkWriteOperation<WithMeta<TSchema>>;
        }
        if ("deleteMany" in op) {
          return op as AnyBulkWriteOperation<WithMeta<TSchema>>;
        }

        // Explicitly reject replaceOne to avoid wiping meta
        if ("replaceOne" in op) {
          throw new Error(
            "bulkWrite.replaceOne is not supported: full document replacement is not allowed"
          );
        }

        // Fallback (should never reach with the union types above)
        throw new TypeError("bulkWrite: unsupported operation variant");
      }
    );

    return collection.bulkWrite(finalOps, options);
  }

  async findOneAndUpdate<TResult extends Document = WithMeta<TSchema>>(
    filter: Filter<WithMeta<TSchema>> = {},
    update: UpdateFilter<WithMeta<TSchema>>,
    options?: FindOneAndUpdateOptions
  ): Promise<ModifyResult<TResult>> {
    const collection = await this.getCollection();

    const finalFilter = {
      "meta.deleted": false,
      ...filter,
    };

    const result = collection.findOneAndUpdate(finalFilter, update, options);
    return result as unknown as ModifyResult<TResult>;
  }

  /** updateOne */
  async updateOne(
    filter: Filter<WithMeta<TSchema>>,
    update: UpdateFilter<WithMeta<TSchema>>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    const collection = await this.getCollection();

    if (!update || typeof update !== "object") {
      throw new TypeError("updateOne: 'update' must be an object.");
    }

    if (!Object.keys(update).some((key) => key.startsWith("$"))) {
      throw Error("Full document replacement is not supported");
    }

    if (Array.isArray(update)) {
      throw new TypeError("updateOne: 'update' must not be an array.");
    }

    const finalUpdate = this.withTouchedMeta(
      update as UpdateFilter<WithMeta<TSchema>>
    );

    return collection.updateOne(filter, finalUpdate, options);
  }

  /** updateMany */
  async updateMany(
    filter: Filter<WithMeta<TSchema>>,
    update: UpdateFilter<WithMeta<TSchema>>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    const collection = await this.getCollection();

    if (!update || typeof update !== "object") {
      throw new TypeError("updateOne: 'update' must be an object.");
    }

    if (!Object.keys(update).some((key) => key.startsWith("$"))) {
      throw Error("Full document replacement is not supported");
    }

    if (Array.isArray(update)) {
      throw new TypeError("updateMany: 'update' must not be an array.");
    }

    const finalUpdate = this.withTouchedMeta(
      update as UpdateFilter<WithMeta<TSchema>>
    );

    return collection.updateMany(filter, finalUpdate, options);
  }

  schemaToProjection(userSchema: z.ZodObject | null = null) {
    const schema = userSchema ?? this.schema;
    const projection = Object.keys(schema.shape).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});

    return projection;
  }
}

type MongrelReturn<T> =
  T extends z.ZodObject<infer S>
    ? Mongrel<z.infer<z.ZodObject<S>>>
    : T extends (...args: unknown[]) => unknown
      ? Mongrel<z.infer<ReturnType<T>>>
      : never;

function mongrel<T extends z.ZodObject | SchemaFactory>(
  collectionName: string,
  schemaOrFactory: T,
  options: Options<T> = {}
): MongrelReturn<T> {
  const schema =
    typeof schemaOrFactory === "function"
      ? (schemaOrFactory as SchemaFactory)("server")
      : (schemaOrFactory as z.ZodObject);

  const defaultValues = defaultsFromSchema(schema);
  return new MongrelImpl(collectionName, schema, {
    defaultValues,
    ...options,
  }) as MongrelReturn<T>;
}

function defaultsFromSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): { [K in keyof T]: unknown } {
  // Build with explicit key typing to avoid `any` and "unknown" errors
  const out: Partial<Record<keyof T, unknown>> = {};

  const entries = Object.entries(schema.shape) as Array<
    [keyof T, z.ZodTypeAny]
  >;

  for (const [key, def] of entries) {
    if (def instanceof z.ZodDefault) {
      // In Zod, defaultValue is typically a function returning the value
      const dv = (def._def as { defaultValue: unknown }).defaultValue as
        | (() => unknown)
        | unknown;
      out[key] = typeof dv === "function" ? (dv as () => unknown)() : dv;
      continue;
    }

    if (def instanceof z.ZodString) {
      out[key] = "";
      // } else if (def instanceof z.ZodNumber) {
      //   out[key] = 0;
      // } else if (def instanceof z.ZodBoolean) {
      //   out[key] = false;
    } else {
      out[key] = null; // arrays, objects, unions, effects, etc.
    }
  }

  return out as { [K in keyof T]: unknown };
}

export type Project<M extends Mongrel, P extends Record<string, 1 | true>> = {
  [K in keyof P & keyof M["Schema"]]: M["Schema"][K];
};

export type Mongrel<TSchema extends Document = Document> = MongrelImpl<TSchema>;
export default mongrel;

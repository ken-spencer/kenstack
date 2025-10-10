export {
  default as projectImage,
  imageProjectionSchema,
  type Image,
} from "./projectImage";

import { getClaims } from "@kenstack/lib/auth";
import type {
  // Db,
  Document,
  Filter,
  // StrictFilter,
  UpdateFilter,
  // WithoutId,
  WithId,
  UpdateOptions,
  // FindOneAndUpdateOptions,
  UpdateResult,
  // ModifyResult,
  OptionalUnlessRequiredId,
  InsertOneResult,
  FindOptions,
} from "mongodb";

import { ObjectId, MongoClient, Db } from "mongodb";

const DEFAULT_OPTIONS: ConstructorParameters<typeof MongoClient>[1] = {
  maxPoolSize: 10, // up to 10 concurrent sockets
  minPoolSize: 0, // let idle connections close
  connectTimeoutMS: 10_000, // fail fast if cluster is unreachable
  socketTimeoutMS: 45_000, // drop long-idle sockets
  serverSelectionTimeoutMS: 5_000,
  retryWrites: true,
};

// Lazy, URI-keyed Mongo client cache (survives HMR)
type MongoCache = { clients: Map<string, Promise<MongoClient>> };
const globalForMongo = globalThis as unknown as { __mongo?: MongoCache };
if (!globalForMongo.__mongo) {
  globalForMongo.__mongo = { clients: new Map() };
}

function resolveUri(explicitUri?: string): string {
  const uri = explicitUri ?? process.env.MONGO_URI;
  if (!uri) throw new Error("Missing Mongo URI (pass one or set MONGO_URI)");
  return uri;
}

export function getMongoClient(
  uri?: string,
  options: ConstructorParameters<typeof MongoClient>[1] = DEFAULT_OPTIONS
): Promise<MongoClient> {
  const resolved = resolveUri(uri);
  const cache = globalForMongo.__mongo!;
  let promise = cache.clients.get(resolved);
  if (!promise) {
    promise = new MongoClient(resolved, options).connect();
    cache.clients.set(resolved, promise);
  }
  return promise;
}

/**
 * Get a MongoDB database instance.
 * @param dbName  optional database name (defaults to the one in URI)
 * @param uri optional Mongo URI to override environment variable
 */
export async function getDb(dbName?: string, uri?: string): Promise<Db> {
  const client = await getMongoClient(uri);
  return dbName ? client.db(dbName) : client.db();
}

export async function getCollection<TSchema extends Document = Document>(
  collectionName: string,
  dbName?: string,
  uri?: string
) {
  const db = await getDb(dbName, uri);
  return db.collection<TSchema>(collectionName);
}

export async function closeMongo(uri?: string): Promise<void> {
  const cache = globalForMongo.__mongo ?? { clients: new Map() };
  if (uri) {
    const p = cache.clients.get(uri);
    if (p) {
      const c = await p;
      await c.close();
      cache.clients.delete(uri);
    }
    return;
  }
  for (const p of cache.clients.values()) {
    const c = await p;
    await c.close();
  }
  cache.clients.clear();
}

export interface Meta {
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId | null;
  deleted: boolean;
}

export type WithMeta<T> = T & { _id?: ObjectId; meta: Meta };

export async function updateOne<T extends Document>(
  name: string,
  filter: Filter<T>,
  update: UpdateFilter<T>,
  options?: UpdateOptions
): Promise<UpdateResult> {
  const db = await getDb();
  const collection = db.collection<T>(name);

  if (!update || typeof update !== "object") {
    throw new TypeError("updateOne: 'update' must be an object.");
  }

  if (!Object.keys(update).some((key) => key.startsWith("$"))) {
    throw Error("Full document replacement is not supported");
  }

  if (Array.isArray(update)) {
    throw new TypeError("updateOne: 'update' must not be an array.");
  }
  const finalUpdate = {
    ...update,
    $set: {
      ...(typeof update.$set === "object" ? update.$set : {}),
      "meta.updatedAt": new Date(),
    },
  } as unknown as UpdateFilter<T>;
  return collection.updateOne(filter, finalUpdate, options);
}

// export async function findOneAndUpdate<T extends Document>(
//   name: string,
//   filter: Filter<T>,
//   update: UpdateFilter<T>,
//   options?: FindOneAndUpdateOptions
// ): Promise<ModifyResult<WithId<T>>> {
//   const db = await getDb();
//   const collection = db.collection<T>(name);

//   if (!update || typeof update !== "object") {
//     throw new TypeError("updateOne: 'update' must be an object.");
//   }

//   if (!Object.keys(update).some((key) => key.startsWith("$"))) {
//     throw Error("Full document replacement is not supported");
//   }

//   if (Array.isArray(update)) {
//     throw new TypeError("updateOne: 'update' must not be an array.");
//   }
//   const finalUpdate = {
//     ...update,
//     $set: {
//       ...(typeof update.$set === "object" ? update.$set : {}),
//       "meta.updatedAt": new Date(),
//     },
//   } as unknown as UpdateFilter<T>;
//   return collection.findOneAndUpdate(filter, finalUpdate, options);
// }

export async function insertOne<T extends Document>(
  name: string,
  insert: OptionalUnlessRequiredId<T>
): Promise<InsertOneResult<WithMeta<T>>> {
  const db = await getDb();
  const collection = db.collection<WithMeta<T>>(name);

  const claims = await getClaims();
  const meta: Meta = {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: claims !== false && claims.sub ? new ObjectId(claims.sub) : null,
    deleted: false,
  };

  const documentWithMeta = {
    ...insert,
    meta,
  };

  return collection.insertOne(
    documentWithMeta as unknown as OptionalUnlessRequiredId<T & { meta: Meta }>
  );
}

export async function findOne<
  TSchema extends Document,
  TResult extends Document = TSchema,
>(
  name: string,
  filter: Filter<WithId<WithMeta<TSchema>>> = {},
  options?: FindOptions<WithId<WithMeta<TSchema>>>
): Promise<TResult> {
  const db = await getDb();
  const collection = db.collection<WithId<WithMeta<TSchema>>>(name);

  const finalFilter = {
    "meta.deleted": false,
    ...filter,
  };

  return collection.findOne<TResult>(finalFilter, options);
}

export async function findMany<
  TSchema extends Document,
  TResult extends Document = WithMeta<TSchema>,
>(
  name: string,
  filter: Filter<WithId<WithMeta<TSchema>>> = {},
  options?: FindOptions<WithId<WithMeta<TSchema>>>
): Promise<TResult[]> {
  const db = await getDb();

  const collection = db.collection<WithId<WithMeta<TSchema>>>(name);

  const finalFilter = {
    "meta.deleted": false,
    ...filter,
  };

  const cursor = collection.find<TResult>(finalFilter, options);

  return cursor.toArray();
}

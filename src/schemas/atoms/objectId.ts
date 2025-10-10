import * as z from "zod";
import { ObjectId } from "bson";

type Return<T> = T extends "client" ? z.ZodType<string> : z.ZodType<ObjectId>;

const isObjectId = (x: unknown): x is ObjectId =>
  typeof x === "object" &&
  x !== null &&
  x.constructor.name === "ObjectId" &&
  typeof (x as ObjectId).toHexString === "function";

function objectId<T extends "client" | "server">(mode: T): Return<T> {
  if (mode === "client") {
    return (
      z
        .any()
        // .transform((v) => (isObjectId(v) ? v.toHexString() : v))
        .transform((v, ctx) => {
          if (isObjectId(v)) {
            return v.toHexString();
          }

          return v;
        })

        .pipe(
          z.string().refine((s) => ObjectId.isValid(s), "Invalid id")
        ) as unknown as Return<T>
    );
  }
  if (mode === "server") {
    return z
      .any()
      .transform((v, ctx) => {
        if (isObjectId(v)) {
          return v;
        }

        if (typeof v === "string" && ObjectId.isValid(v)) {
          return new ObjectId(v);
        }

        ctx.addIssue({
          code: "custom",
          message: "Not a valid ObjectId",
        });

        return z.NEVER;
      })
      .pipe(z.instanceof(ObjectId)) as unknown as Return<T>;
  }
}

export default objectId;

import { type PipelineAction } from "@kenstack/lib/api";
import { getDb } from "@kenstack/lib/db";
import auditLog from "@kenstack/lib/auditLog";

// const idSchema = buildIdSchema((s) => s.default(null));

type UpdateProps = {
  filter?: Record<string, unknown>;
  success?: string;
  error?: string;
  /** if transforming before sending back to client */
  // schemaClient?: z.ZodType<Record<string, unknown>>;
  // TODO, also look into passing context to a schema instead of splitting the schemas.
};
const create =
  (
    collection: string,
    { filter = {}, success: successMessage = "" }: UpdateProps = {}
  ): PipelineAction =>
  async ({ schema, id, data, response }) => {
    if (!id) {
      return response.error("id is required to update");
    }

    const db = await getDb();

    const projection = Object.keys(data).reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      { _id: 0 }
    );

    let result;
    try {
      result = await db.collection(collection).findOneAndUpdate(
        {
          _id: id,
          ...filter,
        },
        { $set: { ...data, "meta.updatedAt": new Date() } },
        { returnDocument: "after", projection }
      );
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

    if (!result) {
      return response.error(
        "No matching record to update. This record may have been deleted or you may not have permission to update it. "
      );
    }

    await auditLog("create-action", "", {
      collection,
      id: id.toHexString(),
    });
    response.success({ message: successMessage, values: schema.parse(result) });
  };

export default create;

import { type PipelineAction } from "@kenstack/lib/api";
import { insertOne } from "@kenstack/lib/db";

type CreateProps = {
  defaultValues?: Record<string, unknown>;
};

const create =
  (
    collection: string,
    { defaultValues = {} }: CreateProps = {}
  ): PipelineAction =>
  async ({ schema, data, response }) => {
    let result;
    try {
      result = await insertOne(collection, {
        ...defaultValues,
        ...data,
      });
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
    response.success({ id: result.insertedId.toHexString() });
    return { id: result.insertedId };
  };

export default create;

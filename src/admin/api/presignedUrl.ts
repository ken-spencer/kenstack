import type { AnyPgTable } from "drizzle-orm/pg-core";
import type { ServerDefinedFields } from "@kenstack/fields/server";

import { pipelineStage } from "@kenstack/api";
import {
  createImageUpload,
  imageUploadRequestSchema,
} from "@kenstack/fields/records/imageUpload";

export const getPresignedUrlAction = (adminConfig: {
  table: AnyPgTable;
  fields: ServerDefinedFields;
}) =>
  pipelineStage(
    { access: "admin", schema: imageUploadRequestSchema },
    async ({ data, response, user }) => {
      const result = await createImageUpload({
        ...adminConfig,
        ...data,
        userId: user.id,
      });

      if (result.status === "error") {
        return response.error(result.message);
      }

      return response.success(result.payload);
    },
  );

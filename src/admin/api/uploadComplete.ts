import type { AnyPgTable } from "drizzle-orm/pg-core";

import { pipelineStage } from "@kenstack/api";
import {
  completeMediaUpload,
  mediaUploadCompleteSchema,
} from "@kenstack/fields/internal/media/upload";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";

export const uploadCompleteAction = (adminConfig: {
  table: AnyPgTable;
  fields: ServerDefinedFields;
}) =>
  pipelineStage(
    {
      access: "admin",
      schema: mediaUploadCompleteSchema,
    },
    async ({ data, response, user }) => {
      const result = await completeMediaUpload({
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

import type { AnyPgTable } from "drizzle-orm/pg-core";

import { pipelineStage } from "@kenstack/api";
import { deps } from "@app/deps";
import {
  completeImageUpload,
  imageUploadCompleteSchema,
} from "@kenstack/fields/records/imageUpload";
import type { ServerDefinedFields } from "@kenstack/fields/server";

export const uploadCompleteAction = (adminConfig: {
  table: AnyPgTable;
  fields: ServerDefinedFields;
}) =>
  pipelineStage(
    { schema: imageUploadCompleteSchema },
    async ({ data, response }) => {
      const user = await deps.auth.requireUser();
      const result = await completeImageUpload({
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

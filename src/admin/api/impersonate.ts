import { pipeline, pipelineStage } from "@kenstack/lib/api";
import { deps } from "@app/deps";
import * as z from "zod";

import type { AdminApiOptions } from "..";

export const impersonatePipeline = (options: AdminApiOptions) => {
  return pipeline(options, [impersonateAction]);
};

const schema = z.object({
  userId: z.number(),
});

const impersonateAction = pipelineStage(
  { schema, role: "admin" },
  async ({ response, user, data: { userId } }) => {
    if (user.id === userId) {
      return response.error("You can't switch to your own user");
    }

    if (user.impersonatedBy) {
      return response.error("You are already switched to another user.");
    }

    await deps.auth.impersonate(userId);

    return response.success({});
  },
);

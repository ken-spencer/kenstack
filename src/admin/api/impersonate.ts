import { pipelineStage } from "@kenstack/api";
import { deps } from "@app/deps";
import * as z from "zod";

const schema = z.object({
  userId: z.number(),
});

export const impersonateAction = () =>
  pipelineStage(
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

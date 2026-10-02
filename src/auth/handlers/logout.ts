import { pipelineStage } from "@kenstack/api";
import type { LogoutResult } from "@kenstack/auth/api";
import { logout as logoutUser } from "@kenstack/auth/server/auth";

export const logoutPipeline = pipelineStage({}, async ({ response }) => {
  await logoutUser();
  return response.success<Omit<LogoutResult, "userInfo">>({
    path: "/",
    returnUser: true,
  });
});

import { pipeline, pipelineStage, type PipelineOptions } from "@kenstack/api";
import type { LogoutResult } from "@kenstack/auth/api";
import { logout as logoutUser } from "@kenstack/auth/server/auth";
import { loadFreshPublicAuthState } from "@kenstack/auth/server/state";

export const logoutPipeline = () => (options: PipelineOptions) =>
  pipeline(options, logout());

const logout = () =>
  pipelineStage({}, async ({ response }) => {
    await logoutUser();
    return response.success<LogoutResult>({
      authState: await loadFreshPublicAuthState(),
      path: "/",
    });
  });

import { deps } from "@app/deps";
import {
  pipeline,
  pipelineStage,
  type PipelineOptions,
} from "@kenstack/lib/api";

export const logoutPipeline = () => (options: PipelineOptions) =>
  pipeline(options, [logout()]);

export const logout = () =>
  pipelineStage({}, async ({ response }) => {
    await deps.auth.logout();
    return response.success({
      path: "/",
    });
  });

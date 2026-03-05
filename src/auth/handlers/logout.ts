import { deps } from "@server/deps";
import {
  pipeline,
  type PipelineAction,
  type PipelineOptions,
} from "@kenstack/lib/api";

export const logoutPipeline = () => (options: PipelineOptions) =>
  pipeline(options, [logout()]);

export const logout =
  (): PipelineAction =>
  async ({ response }) => {
    await deps.auth.logout();
    return response.success({
      path: "/",
    });
  };

import { getAuthenticatedUser, hasRole, revalidate } from "@kenstack/lib/auth";
import type { PipelineAction } from ".";

const authenticate =
  ({ roles = ["ADMIN"] } = {}): PipelineAction =>
  async ({ response }) => {
    if (!(await hasRole(roles))) {
      return response.redirectToLogin();
    }
    const user = await getAuthenticatedUser();
    if (!user) {
      return response.redirectToLogin();
    }

    await revalidate();
    return { user };
  };

export default authenticate;

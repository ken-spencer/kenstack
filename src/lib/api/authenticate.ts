import type { PipelineAction } from ".";
import { deps } from "@app/deps";

type UserRole = (typeof deps.roles)[number];

const authenticate =
  (options?: { role: UserRole | UserRole[] }): PipelineAction =>
  async ({ response }) => {
    const user = await deps.auth.getCurrentUser();

    if (!user) {
      return response.redirectToLogin();
    }

    if (options?.role) {
      const requiredRoles = Array.isArray(options.role)
        ? options.role
        : [options.role];

      const hasPermission = user.roles.some((userRole) =>
        requiredRoles.includes(userRole as UserRole),
      );

      if (!hasPermission) {
        return response.redirectToLogin();
      }
    }

    // await revalidate();
    return { user };
  };

export default authenticate;

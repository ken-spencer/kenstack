import "server-only";

import {
  accountChangedRefusal,
  renderedAccountHeader,
} from "@kenstack/auth/renderedAccount";
import { isAccessGranted } from "@kenstack/admin/lib/moduleAccess";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import { getCurrentUser } from "@kenstack/auth/server/user";

export const permissionRefusal = {
  message: "You do not have permission to perform this action.",
  status: 403,
};

// The signed-in user a request acts for with this access, or why it may not: any of the roles, or a
// permission in a module. A page rendered for one account never acts as another: the browser sends that
// account, and a session for any other is refused first.
export async function resolveAccess(request: Request, access: AuthAccess) {
  const user = await getCurrentUser();
  const renderedAccount = request.headers.get(renderedAccountHeader);
  if (user && renderedAccount !== null && String(user.id) !== renderedAccount) {
    return { refusal: { ...accountChangedRefusal, status: 409 } };
  }
  if (!user) {
    return {
      refusal: {
        message: "You must be signed in to perform this action.",
        status: 401,
      },
    };
  }
  if (!isAccessGranted(user.roles, access)) {
    return { refusal: permissionRefusal };
  }
  return { user };
}

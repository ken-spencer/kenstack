import "server-only";

import {
  accountChangedRefusal,
  renderedAccountHeader,
} from "@kenstack/auth/renderedAccount";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import { hasRoleAccess } from "@kenstack/auth/server/roleAccess";
import { getCurrentUser } from "@kenstack/auth/server/user";

// The signed-in user a request acts for with this access, or why it may not, from one session read. A
// page rendered for one account never acts as another: the browser sends that account, and a session
// for any other is refused first.
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
  if (!hasRoleAccess(user.roles, access)) {
    return {
      refusal: {
        message: "You do not have permission to perform this action.",
        status: 403,
      },
    };
  }
  return { user };
}

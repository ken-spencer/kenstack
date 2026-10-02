import type { AuthAccess } from "./auth";
import type { Role } from "./types";

// Whether a signed-in user's roles meet this access: any one of the named roles, or just being signed
// in. hasRole, requireUser and the API access check all decide by it.
export function hasRoleAccess(roles: readonly Role[], access: AuthAccess) {
  if (access === "authenticated") {
    return true;
  }
  const requiredRoles = Array.isArray(access) ? access : [access];
  return roles.some((role) => requiredRoles.includes(role));
}

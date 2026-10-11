/*
 * Public entry point: hasRoleAccess and RoleAccess, for server or client code that checks known roles,
 * such as a site's client component deciding whether a link would open. Isomorphic; it imports only
 * types. A module's grants need the server: hasAccess checks every form of access.
 */

import type { Role } from "@kenstack/auth/server/types";

// The forms of access that roles alone decide: anyone signed in, or any one of these roles.
export type RoleAccess = "authenticated" | Role | readonly Role[];

// Whether a signed-in user's roles meet this access: any one of the named roles, or just being signed
// in. An admin meets every list, so a list names only the other roles it lets in.
export function hasRoleAccess(roles: readonly string[], access: RoleAccess) {
  if (access === "authenticated" || roles.includes("admin")) {
    return true;
  }
  const requiredRoles = Array.isArray(access) ? access : [access];
  return requiredRoles.some((role) => roles.includes(role));
}

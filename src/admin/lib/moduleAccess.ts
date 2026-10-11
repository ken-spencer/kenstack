import "server-only";

import { modules } from "@app/modules";
import { hasRoleAccess } from "@kenstack/auth/roleAccess";
import type { AuthAccess } from "@kenstack/auth/server/auth";

// What someone may do in a module. A permission left out is off.
export type Permissions = {
  view?: boolean;
  edit?: boolean;
  delete?: boolean;
};

const viewer = { view: true };
const contributor = { ...viewer, edit: true };
const editor = { ...contributor, delete: true };

// What each grant level permits, keyed as a module grants it.
const levelPermissions: Record<
  "viewers" | "contributors" | "editors",
  Permissions
> = {
  viewers: viewer,
  contributors: contributor,
  editors: editor,
};

// Whether someone with these roles has this access. A module permission is always an admin's, otherwise
// theirs when a level the module grants one of their roles permits it, so their permissions are the
// union of their roles' grants; a record-scoped child module follows its parent's grants. Every other
// form is decided by the roles alone.
export function isAccessGranted(roles: readonly string[], access: AuthAccess) {
  if (typeof access !== "object" || !("module" in access)) {
    return hasRoleAccess(roles, access);
  }
  const moduleConfig = modules[access.module];
  const grants = moduleConfig?.parent
    ? modules[moduleConfig.parent.module]
    : moduleConfig;
  return (["viewers", "contributors", "editors"] as const).some(
    (level) =>
      levelPermissions[level][access.permission] &&
      hasRoleAccess(roles, grants?.[level] ?? []),
  );
}

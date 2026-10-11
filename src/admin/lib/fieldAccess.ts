import "server-only";

import { modules } from "@app/modules";
import { hasAccess } from "@kenstack/auth/server/auth";
import { adminOnlyUserFields } from "@kenstack/modules/users/adminOnlyFields";

// The module fields the signed-in person can't see (hidden) or change (locked) on a new or existing
// record, by name, for the editor and the save. An admin gets every field. For anyone else, a field
// whose access leaves them out is hidden; one that names them is locked when they can't save the
// record. On an existing contact, the sign-in email is locked.
export async function loadFieldAccess(name: string, isNew: boolean) {
  const fieldAccess: Record<string, "hidden" | "locked"> = {};
  if (await hasAccess("admin")) {
    return fieldAccess;
  }
  const canSave = await hasAccess({ module: name, permission: "edit" });
  for (const [fieldName, field] of Object.entries(
    modules[name]?.admin?.fields ?? {},
  )) {
    if (field.access === undefined) {
      continue;
    }
    if (!(await hasAccess(field.access))) {
      fieldAccess[fieldName] = "hidden";
    } else if (!canSave) {
      fieldAccess[fieldName] = "locked";
    }
  }
  if (name === "users" && !isNew) {
    for (const fieldName of adminOnlyUserFields) {
      fieldAccess[fieldName] ??= "locked";
    }
  }
  return fieldAccess;
}

// The fields the person can't see, whose values never reach the browser.
export function getHiddenFields(
  fieldAccess: Awaited<ReturnType<typeof loadFieldAccess>>,
) {
  return Object.keys(fieldAccess).filter(
    (field) => fieldAccess[field] === "hidden",
  );
}

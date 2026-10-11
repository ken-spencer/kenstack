/*
 * Public entry point for the users admin: the role field and the full users field set. The role field
 * lists every site role, so only admin and server code import this file; public forms use `./fields`.
 */

import roles from "@app/roles";
import startCase from "lodash-es/startCase";
import { defineFields } from "@kenstack/admin/fields";
import { checkboxListField } from "@kenstack/fields";

import { userFields } from "./fields";

// Only admins see or change roles, whichever roles a site lets open users.
export const userRoleField = checkboxListField({
  access: "admin",
  filter: true,
  label: "Access Roles",
  options: Object.entries<{ label?: string }>(roles).map(
    ([value, { label }]) => ({ value, label: label ?? startCase(value) }),
  ),
});

export const fields = defineFields({
  fields: {
    ...userFields,
    roles: userRoleField,
  },
});

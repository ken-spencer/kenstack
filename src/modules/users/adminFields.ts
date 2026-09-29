/*
 * Public entry point for the users admin: the role field and the full users field set. The role field
 * lists every site role, so only admin and server code import this file; public forms use `./fields`.
 */

import roles from "@app/roles";
import { defineFields } from "@kenstack/admin/fields";
import { checkboxListField } from "@kenstack/fields";

import { userFields } from "./fields";

export const userRoleField = checkboxListField({
  filter: true,
  label: "Access Roles",
  options: Object.entries(roles).map(([value, { label }]) => ({
    value,
    label,
  })),
});

export const fields = defineFields({
  fields: {
    ...userFields,
    roles: userRoleField,
  },
});

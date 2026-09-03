import roles from "@app/roles";
import { defineFields } from "@kenstack/admin/fields";
import {
  checkboxListField,
  emailField,
  imageField,
  textField,
} from "@kenstack/fields";
import { email } from "@kenstack/fields/email";
import * as z from "zod";

const roleOptions = Object.entries(roles).map(([value, { label }]) => ({
  value,
  label,
}));

export const userFields = {
  givenName: textField({
    zod: z.string().trim().min(1, "Given name is required"),
    searchable: true,
    list: true,
    filter: true,
    sort: true,
  }),
  familyName: textField({
    zod: z.string().trim().min(1, "Family name is required"),
    searchable: true,
    list: true,
    filter: true,
    sort: true,
  }),
  email: emailField({
    searchable: true,
    list: true,
    filter: true,
    sort: true,
    zod: email,
  }),
  avatar: imageField({ list: "square" }),
};

export const userRoleField = checkboxListField({
  filter: true,
  label: "Access Roles",
  options: roleOptions,
});

export const fields = defineFields({
  fields: {
    ...userFields,
    roles: userRoleField,
  },
});

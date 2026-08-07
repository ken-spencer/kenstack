import roles from "@app/deps/roles";
import { defineFields } from "@kenstack/admin/fields";
import {
  checkboxListField,
  emailField,
  imageField,
  textField,
} from "@kenstack/fields";
import { email } from "@kenstack/fields/email";
import * as z from "zod";

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
  options: roles,
});

export const fields = defineFields({
  fields: {
    ...userFields,
    roles: userRoleField,
  },
});

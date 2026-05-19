import roles from "@app/deps/roles";

import { defineFields } from "@kenstack/admin/fields";
import * as z from "zod";
import { email } from "@kenstack/schemas/atoms";

const userRoles = roles.map(([role]) => role);

export const userFieldOptions = {
  givenName: {
    default: "",
    zod: z.string().min(1, "Given name is required"),
    searchable: true,
  },
  familyName: {
    default: "",
    zod: z.string().min(1, "Family name is required"),
    searchable: true,
  },
  email: {
    default: "",
    zod: email().min(1, "Email is required"),
    searchable: true,
  },
  avatar: { kind: "image" },
  roles: { default: [], zod: z.array(z.enum(userRoles)) },
} as const;

export const fields = defineFields(userFieldOptions);

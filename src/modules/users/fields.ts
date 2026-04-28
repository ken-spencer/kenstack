import roles from "@app/deps/roles";

import { defineFields } from "@kenstack/admin";
import * as z from "zod";
import { email, image } from "@kenstack/schemas/atoms";

const userRoles = roles.map(([role]) => role);

export const fields = defineFields({
  firstName: {
    default: "",
    zod: z.string().min(1, "First name is required"),
    searchable: true,
  },
  lastName: {
    default: "",
    zod: z.string().min(1, "Last name is required"),
    searchable: true,
  },
  email: {
    default: "",
    zod: email().min(1, "Email is required"),
    searchable: true,
  },
  avatar: { default: null, zod: image() },
  roles: { default: [], zod: z.array(z.enum(userRoles)) },
});

// import { desc } from "drizzle-orm";

import { users } from "./tables";
import { UsersRound } from "lucide-react";

import { adminConfig } from "@kenstack/admin/config";
import client from "./client";
import { fields } from "./fields";

export const userAdminConfigOptions = {
  title: "Users",
  icon: UsersRound,
  client,
  fields,
  table: users,
  // revalidate: ["blog", ({ slug }) => `blog-${slug}`],
  select: {
    givenName: users.givenName,
    familyName: users.familyName,
    email: users.email,
  },
} as const;

const config = adminConfig(userAdminConfigOptions);

export default config;

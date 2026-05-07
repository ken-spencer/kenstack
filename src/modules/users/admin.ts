// import { desc } from "drizzle-orm";

import { users } from "./tables";
import { UsersRound } from "lucide-react";

import { adminTable } from "@kenstack/admin";
import client from "./client";
import { fields } from "./fields";

const config = adminTable({
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
});

export default config;

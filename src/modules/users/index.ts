import { UsersRound } from "lucide-react";

import { defineModule } from "@kenstack/admin";
import client from "./client";
import { fields } from "./fields";
import { users } from "./tables";

const usersModule = defineModule({
  name: "users",
  title: "Users",
  icon: UsersRound,
  client,
  fields,
  table: users,
  sort: {
    name: {
      fields: ["givenName", "familyName"],
    },
    email: {
      fields: ["email"],
    },
  },
});

export default usersModule;

import { UsersRound } from "lucide-react";

import { defineModule } from "@kenstack/admin/server";
import { fields } from "./fields";
import { users } from "./tables";

const usersModule = defineModule({
  name: "users",
  title: "Users",
  icon: UsersRound,
  admin: {
    fields,
    table: users,
    list: {
      sort: {
        name: {
          fields: ["givenName", "familyName"],
        },
        email: {
          fields: ["email"],
        },
      },
    },
  },
});

export default usersModule;

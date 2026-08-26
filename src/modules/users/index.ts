import { UsersRound } from "lucide-react";

import { defineModule } from "@kenstack/admin/server";
import { userSessionsCacheTag } from "@kenstack/auth/server/user";
import { fields } from "./fields";
import { users } from "./tables";

const usersModule = defineModule({
  name: "users",
  title: "Users",
  icon: UsersRound,
  admin: {
    fields,
    table: users,
    revalidate: [(user) => userSessionsCacheTag(user.id)],
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

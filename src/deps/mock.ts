import { createDeps } from "@kenstack/deps";

import * as users from "@kenstack/db/tables/users";
import * as coreTables from "@kenstack/db/tables";
import { createContent } from "@kenstack/db/tables/content";
const content = createContent();

import { RectangleEllipsis, UserPen } from "lucide-react";

const tables = { ...users, ...coreTables, ...content };

export const deps = createDeps({
  tables,
  accountMenu: {
    getItems: () => [
      ["/profile", "Profile", UserPen],
      ["/reset-password", "Reset Password", RectangleEllipsis],
    ],
  },
});

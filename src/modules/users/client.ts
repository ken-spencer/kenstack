"use client";

import { defineClient } from "@kenstack/admin/client";
import EditForm from "./components/EditForm";
import { fields } from "./fields";
import { UserAvatarListItem, UserNameListItem } from "./components/ListItems";

export default defineClient({
  admin: {
    fields,
    listItems: [
      [
        (row) => UserAvatarListItem({ row }),
        { className: "flex items-center", column: "auto" },
      ],
      [(row) => UserNameListItem({ row })],
      [
        (row) => row.email,
        {
          className:
            "text-muted-foreground hidden self-center truncate text-sm sm:block",
        },
      ],
    ],
    EditForm,
  },
});

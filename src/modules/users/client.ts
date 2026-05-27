"use client";

import { defineClient } from "@kenstack/admin/client";
import EditForm from "./components/EditForm";
import { fields } from "./fields";
import { UserEmailListItem, UserNameListItem } from "./components/ListItems";

export default defineClient({
  fields,
  listItems: [
    [(row) => UserNameListItem({ row }), { column: "auto" }],
    [
      (row) => UserEmailListItem({ row }),
      { className: "hidden self-center sm:block" },
    ],
  ],
  EditForm,
});

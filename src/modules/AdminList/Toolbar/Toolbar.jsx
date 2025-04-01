"use client";

// import fetchJSON from "../../../utils/fetchJSON";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Delete from "./Delete";
import Search from "./Search";

import AddIcon from "@kenstack/icons/Add";
import AdminIcon from "@kenstack/components/AdminIcon";
// import Button from "@kenstack/forms/Button";

// import deleteAction from "./deleteAction";

import { useAdminList } from "../context";

export default function AdminListToolbar() {
  const { selected, admin } = useAdminList();
  const pathName = usePathname();

  return (
    <>
      <div className="flex items-center admin-border p-1">
        <div className="">
          <AdminIcon
            component={Link}
            href={pathName + "/new"}
            tooltip="New entry"
          >
            <AddIcon width="32" height="32" />
          </AdminIcon>
        </div>

        <div className="flex-1 text-center">{admin.title}</div>

        <div className="text-right w-64">
          {selected.size > 0 ? (
            <Delete />
          ) : (
            <div>
              <Search />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

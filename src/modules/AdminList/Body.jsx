"use client";

import get from "lodash/get";
import React, { useCallback } from "react";
// import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

import Checkbox from "@kenstack/forms/base/Checkbox";

import { useAdminList } from "./context";
import Link from "next/link";

// const isSelected = () => false;

export default function AdminListBody() {
  const { rows, admin, userId, select, deselect, selected } = useAdminList();
  const pathName = usePathname();
  // const router = useRouter();

  const handleCheckbox = useCallback(
    (event, id) => {
      event.stopPropagation();
      if (id == userId) {
        return;
      }
      if (selected.has(id)) {
        deselect(id);
      } else {
        select(id);
      }
    },
    [selected, select, deselect, userId],
  );

  const list = admin.getList();

  return rows.map((row) => {
    // const isItemSelected = isSelected(row.id);

    return (
      <div className="admin-row contents" key={row._id}>
        <label
          key="select"
          className={userId !== row._id ? "cursor-pointer" : ""}
        >
          <Checkbox
            disabled={userId == row._id}
            checked={selected.has(row._id)}
            onChange={(event) => handleCheckbox(event, row._id)}
          />
        </label>

        {list.map((cell, key) => {
          let value = get(row, cell.name);
          if (cell.filter) {
            value = cell.filter(value);
          }
          if (cell.component) {
            let Component = cell.component;
            value = <Component value={value} />;
          }

          return (
            <Link key={cell.name} href={pathName + "/" + row._id}>
              {value}
            </Link>
          );
        })}
      </div>
    );
  });
}

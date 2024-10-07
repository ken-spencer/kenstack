"use client";

import get from "lodash/get";
import React, { useCallback } from "react";
// import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

// import TableBody from "@mui/material/TableBody";
// import TableRow from "@mui/material/TableRow";
// import TableCell from "@mui/material/TableCell";

import Checkbox from "@kenstack/forms/base/Checkbox";

import { useAdminList } from "./context";
import Link from "next/link";

const emptyRows = 1;
const dense = true;
const isSelected = () => false;

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
    const isItemSelected = isSelected(row.id);

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

  /*
  return (
    <TableBody>
      {rows.map((row) => {
        const isItemSelected = isSelected(row.id);

        return (
          <TableRow
            hover
            role="checkbox"
            aria-checked={selected.has(row._id)}
            tabIndex={-1}
            key={row._id}
            selected={isItemSelected}
            sx={{ cursor: "pointer" }}
            onClick={() => {
              // router.push(pathName + "/" + row._id);
              window.location.href = pathName + "/" + row._id;
            }}
          >
            <TableCell
              padding="checkbox"
              onClick={(event) => handleCheckbox(event, row._id)}
            >
              <Checkbox
                disabled={userId == row._id}
                checked={selected.has(row._id)}
              />
            </TableCell>
            {list.map((cell, key) => {
              const isLast = list.length - 2 === key;
              return (
                <TableCell
                  key={cell.name}
                  className={isLast ? "admin-second-last-cell" : "admin-cell"}
                >
                  {(() => {
                    const value = get(row, cell.name);
                    if (cell.filter) {
                      return cell.filter(value);
                    }
                    if (cell.component) {
                      // let Component = cell.component;
                      // return <Component value={value} />;
                    }
                    return value;
                  })()}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
      {emptyRows > 0 && (
        <TableRow
          style={{
            height: (dense ? 33 : 53) * emptyRows,
          }}
        >
          <TableCell colSpan={list.length + 1} />
        </TableRow>
      )}
    </TableBody>
  );
  */
}

"use client";

import { useAdminList } from "./context";

import ArrowIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import Checkbox from "@kenstack/forms/base/Checkbox";

export default function ListHead() {
  const { rows, selected, select, sortBy, setSortBy, admin } = useAdminList();
  const [orderBy, order] = sortBy || [];

  const handleSortClick = (name) => () => {
    let newOrder = "asc";

    if (name === orderBy) {
      newOrder = order === "asc" ? "desc" : "asc";
    }

    setSortBy([name, newOrder]);
  };

  const handleSelectAllClick = (evt) => {
    if (evt.target.checked) {
      const selectList = rows.map((row) => {
        return row._id;
      });
      select(selectList);
    } else {
      select([]);
    }
  };

  const list = admin.getList();
  return (
    <>
      <label className="cursor-pointer">
        <Checkbox
          // indeterminate={selected.size > 0 && selected.size < rows.length - 1}
          // checked={rows.length > 0 && selected.size >= rows.length - 1}
          checked={rows.length > 0 && selected.size > 0}
          onChange={handleSelectAllClick}
        />
      </label>

      {list.map((cell, key) => {
        return (
          <div
            key={cell.name}
            className={
              "font-bold group " +
              cell.className +
              (cell.sortable ? " sortable cursor-pointer" : "")
            }
            onClick={cell.sortable ? handleSortClick(cell.name) : () => {}}
          >
            {cell.title}
            {cell.sortable && (
              <ArrowIcon
                className={
                  "w-4 h-4 ml-2 inline-block " +
                  (orderBy === cell.name
                    ? order === "desc"
                      ? " rotate-180"
                      : ""
                    : " opacity-0 group-hover:opacity-50")
                }
              />
            )}
          </div>
        );
      })}
    </>
  );
}

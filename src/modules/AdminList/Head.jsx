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
      const list = rows.map((row) => {
        return row._id;
      });
      select(list);
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
              "font-boldk group " +
              (cell.sortable ? " sortable cursor-pointer" : "")
            }
            onClick={cell.sortable && handleSortClick(cell.name)}
          >
            {cell.label}
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

  /*
  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            // indeterminate={selected.size > 0 && selected.size < rows.length - 1}
            // checked={rows.length > 0 && selected.size >= rows.length - 1}
            checked={rows.length > 0 && selected.size > 0}
            onChange={handleSelectAllClick}
          />
        </TableCell>
        {list.map((headCell, key) => {
          const isLast = list.length - 2 === key;
          return (
            <TableCell
              className={isLast ? "admin-second-last-cell" : "admin-cell"}
              key={headCell.name}
              align="left"
              padding="normal"
              sortDirection={orderBy === headCell.name ? order : false}
            >
              {headCell.sortable ? (
                <TableSortLabel
                  active={orderBy === headCell.name}
                  direction={orderBy === headCell.name ? order : "asc"}
                  onClick={handleSortClick(headCell.name)}
                >
                  {headCell.label}
                  {orderBy === headCell.name ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === "desc"
                        ? "sorted descending"
                        : "sorted ascending"}
                    </Box>
                  ) : null}
                </TableSortLabel>
              ) : (
                headCell.label
              )}
            </TableCell>
          );
        })}
      </TableRow>
    </TableHead>
  );
   */
}

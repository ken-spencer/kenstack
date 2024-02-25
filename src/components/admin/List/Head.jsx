"use client";

import useAdmin from "./useAdmin";

import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableSortLabel from "@mui/material/TableSortLabel";
import Box from "@mui/material/Box";
import { visuallyHidden } from "@mui/utils";

import Checkbox from "@mui/material/Checkbox";

import styles from "../admin.module.scss";

export default function ListHead() {
  const { rows, selected, select, sortBy, setSortBy, modelName } = useAdmin();
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

  const admin = thaumazoAdmin.get(modelName);
  const list = admin.getList();

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={selected.size > 0 && selected.size < rows.length - 1}
            checked={rows.length > 0 && selected.size >= rows.length - 1}
            onChange={handleSelectAllClick}
            inputProps={{
              "aria-label": "select all desserts",
            }}
          />
        </TableCell>
        {list.map((headCell, key) => {
          const isLast = list.length - 2 === key;
          return (
            <TableCell
              className={isLast ? styles.secondLastCell : styles.cell}
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
}

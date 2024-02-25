"use client";

import TablePagination from "@mui/material/TablePagination";

const page = 1;
const rowsPerPage = 10;
const rows = [];

export default function Pagination() {
  const handleChangePage = () => {};
  const handleChangeRowsPerPage = () => {};

  if (rows.length < rowsPerPage) {
    return null;
  }
  return (
    <TablePagination
      rowsPerPageOptions={[5, 10, 25]}
      component="div"
      count={rows.length}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
    />
  );
}

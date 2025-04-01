"use client";
import { useAdminList } from "./context";

export default function Pagination() {
  const { total } = useAdminList();

  if (total === null || total === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-2 admin-border bg-gray-100 dark:bg-gray-900 text-sm">
      <div className="">
        {total} Record{total > 1 ? "s" : ""}
      </div>
    </div>
  );

  /*
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
  */
}

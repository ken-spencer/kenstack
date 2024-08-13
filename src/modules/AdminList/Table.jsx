"use client";

import { useAdminList } from "./context";
import Error from "@kenstack/components/Error";

import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import Loading from "@kenstack/components/Loading";

import Head from "./Head";
import Body from "./Body";

export default function AdminListTable() {
  const { error, isLoading } = useAdminList();

  if (error) {
    return <Error message={error} />;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className={"admin-list-body"}>
      <TableContainer>
        <Table sx={{ minWidth: 750 }} size="medium">
          <Head />
          <Body />
        </Table>
      </TableContainer>
    </div>
  );
}

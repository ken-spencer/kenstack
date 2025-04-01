"use client";
// import Cookies from "js-cookie";
import React from "react";

// import authenticate from "../../../auth/authenticate";

// import verifyJWT from "@kenstack/auth/verifyJWT";
// import loadQuery from "./loadQuery";
// import errorLog from "../../../log/error";

import { AdminListProvider } from "./context";

import Toolbar from "./Toolbar";
import AdminListTable from "./Table";
import Pagination from "./Pagination";

import { useServer } from "@kenstack/server/context";

// Let's us pass server data to server actions
export default function AdminList({ admin }) {
  const serverProps = useServer();

  return (
    <AdminListProvider
      {...serverProps}
      // sortBy={sortBy}
      // keywords={keywords}
      // initialData={initialData}
      admin={admin}
      // userId={claims.sub}
    >
      <div className="flex flex-col gap-1">
        <Toolbar />
        <AdminListTable />
        <Pagination />
      </div>
    </AdminListProvider>
  );
}

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
  // const queryClient = new QueryClient({
  //   queryCache: new QueryCache({
  //     onError: (error) => {
  //       // eslint-disable-next-line no-console
  //       console.error(error);
  //     },
  //   }),
  //   defaultOptions: {
  //     queries: {
  //       // With SSR, we usually want to set some default staleTime
  //       // above 0 to avoid refetching immediately on the client
  //       staleTime: 60 * 1000,
  //     },
  //   },
  // });

  /*
  const claims = {}; // verifyJWT();
  const key = "admin" + admin.modelName;
  const sortCookie = Cookies.get(key + "Sort");
  const keywordsCookie = Cookies.get(key + "Keywords") || "";

  const sortBy = sortCookie ? sortCookie.value : "";
  const keywords = keywordsCookie ? keywordsCookie.value : "";
  */

  const { initialData, claims, sortBy, keywords } = useServer();

  /*
  let rows = [];
  try {
    rows = await loadQuery({ admin, model, sortBy, keywords });
  } catch (e) {
    errorLog(e, "Problem loading admin rows");
    return (
      <Alert severity="error">
        There was an unexpected problem retrieving your data from the server.
        Please try again later.
      </Alert>
    );
  }
  */

  return (
    <AdminListProvider
      sortBy={sortBy}
      keywords={keywords}
      initialData={initialData}
      admin={admin}
      userId={claims.sub}
    >
      <div>
        <Toolbar />
        <AdminListTable />
        <Pagination />
      </div>
    </AdminListProvider>
  );
}

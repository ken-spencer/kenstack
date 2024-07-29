import { cookies } from "next/headers";

// import authenticate from "../../../auth/authenticate";
import Alert from "@mui/material/Alert";
import ThemeProvider from "../ThemeProvider";

import verifyJWT from "@thaumazo/cms/auth/verifyJWT";
import loadQuery from "./loadQuery";
import errorLog from "../../../log/error";

import Provider from "./Provider";

import Toolbar from "./Toolbar";
import AdminListTable from "./Table";
import Pagination from "./Pagination";

// Let's us pass server data to server actions
export default async function AdminList({ admin, model, modelName }) {
  // const user = await authenticate("ADMIN");
  // const userId = String(user._id);

  if (!modelName) {
    throw Error("Model must be provided to AdminList");
  }

  const claims = verifyJWT();
  const key = "admin" + modelName;
  const sortCookie = cookies().get(key + "Sort");
  const keywordsCookie = cookies().get(key + "Keywords") || "";

  const sortBy = sortCookie ? sortCookie.value : "";
  const keywords = keywordsCookie ? keywordsCookie.value : "";

  let rows = [];
  try {
    rows = await loadQuery({ admin, model, sortBy, keywords });
  } catch (e) {
    errorLog(e, "Problem loading admin rows");
    return (
      <ThemeProvider theme="auto">
        <Alert severity="error">
          There was an unexpected problem retrieving your data from the server.
          Please try again later.
        </Alert>
      </ThemeProvider>
    );
  }

  return (
    <Provider
      sortBy={sortBy}
      keywords={keywords}
      rows={rows}
      modelName={modelName}
      userId={claims.sub}
    >
      <div>
        <Toolbar />
        <AdminListTable />
        <Pagination />
      </div>
    </Provider>
  );
}

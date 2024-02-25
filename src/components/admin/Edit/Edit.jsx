import "server-only";

import authenticate from "../../../auth/authenticate";

import Alert from "@mui/material/Alert";
import ThemeProvider from "../ThemeProvider";
import errorLog from "../../../log/error";

// import accessCheck from "@thaumazo/cms/auth/accessCheck";

// import errorLog from "../../../log/error";

// import Alert from "@mui/material/Alert";

import Provider from "./Provider";
import AdminForm from "./Form";
// import ThemeProvider from "@thaumazo/forms/ThemeProvider";

import { notFound } from "next/navigation";

export default async function AdminEdit({
  admin,
  model,
  id,
  params,
  modelName,
}) {
  const user = await authenticate(["ADMIN"]);
  const userId = String(user._id);

  if (!modelName) {
    throw Error("Model must be provided to AdminList");
  }

  // this is probably deprecated
  if (!id) {
    id = params.id || "";
  }

  let isNew = false;

  if (id === "new") {
    isNew = true;
    id = null;
  } else if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    notFound();
  }

  let row;
  const select = admin.getPaths();
  if (isNew == false) {
    try {
      row = await model.findById(id).select(select);
      // leanRow = await model.findById(id).select(select).lean();
    } catch (e) {
      errorLog(e, "Problem loading admin row");
      return (
        <ThemeProvider theme="auto">
          <Alert severity="error">
            There was an unexpected problem loading admin data. Please try again
            later.
          </Alert>
        </ThemeProvider>
      );
    }

    if (!row) {
      notFound();
    }
  }

  return (
    <Provider
      modelName={modelName}
      isNew={isNew}
      id={id}
      row={row && row.toAdminDTO(select)}
      userId={userId}
    >
      <AdminForm />
    </Provider>
  );
}

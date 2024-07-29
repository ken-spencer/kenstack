import React from "react";

import errorLog from "../../log/error";
import Alert from "@thaumazo/forms/Alert";
import accessCheck from "../../auth/accessCheck";

import Suspense from "./Suspense";
const Login = React.lazy(() => import("./Login"));

// Deep authentication. Call this later to allow for some UI to be rendered.
export default async function Authenticate({ children }) {
  let user;
  try {
    user = await accessCheck(["ADMIN"]);
  } catch (e) {
    errorLog(e, "Problem verifying access");
    return (
      <Alert severity="error">
        There was an unexpected problem connecting to the database. Please try
        again later{" "}
      </Alert>
    );
  }

  if (!user) {
    return (
      <Suspense>
        <Login />
      </Suspense>
    );
  }

  return children;
}

import React from "react";

// import authenticate from "../../../auth/authenticate";
// import accessCheck from "../../../auth/accessCheck";
import verifyJWT from "@thaumazo/cms/auth/verifyJWT";

import { notFound } from "next/navigation";
const Login = React.lazy(() => import("../Login"));
const ForgottenPassword = React.lazy(() => import("../ForgottenPassword"));

import Session from "../Session";
const ResetPassword = React.lazy(() => import("../ResetPassword"));
const List = React.lazy(() => import("../List"));
const Edit = React.lazy(() => import("../Edit"));

import Suspense from "../Suspense";

export default async function AdminRouter(props) {
  const { params } = props;

  if (typeof thaumazoAdmin === "undefined") {
    notFound();
    // throw Error("server.admin prop must be specified");
  }
  if (typeof thaumazoModels === "undefined") {
    throw Error("server.models prop must be specified");
  }

  const adminParams = params.admin || [];
  if (adminParams.length > 2) {
    notFound();
  }

  let [segment = null, id = null] = adminParams;

  // public (non secure) routes
  switch (segment) {
    case "login":
      return (
        <Suspense>
          <Login {...params} />
        </Suspense>
      );
    case "forgotten-password":
      return (
        <Suspense>
          <ForgottenPassword {...params} id={id} />
        </Suspense>
      );
  }

  if (segment && (segment === "new" || segment.match(/^[0-9a-fA-F]{24}$/))) {
    id = segment;
    segment = null;
  }

  // const user = await accessCheck(["ADMIN"]);
  const claims = await verifyJWT(["ADMIN"]);
  if (!claims) {
    return (
      <Suspense>
        <Login {...params} />
      </Suspense>
    );
  }

  // these routes require authentication
  switch (segment) {
    case "reset-password":
      return (
        <Suspense>
          <ResetPassword {...params} />
        </Suspense>
      );
  }

  const path = "/" + (segment === null ? "" : segment);
  const admin = thaumazoAdmin.getByPath(path);

  // const admin = thaumazoAdmin.navigation.get(segment);
  if (!admin) {
    notFound();
    // throw Error("No admin data has been loaded");
  }

  const modelName = admin.modelName;
  const model = await thaumazoModels.get(modelName);
  if (!model) {
    throw Error("No model found for: " + modelName);
  }

  if (id) {
    return (
      <Session>
        <Suspense>
          <Edit
            {...params}
            modelName={modelName}
            admin={admin}
            model={model}
            id={id}
          />
        </Suspense>
      </Session>
    );
  }
  return (
    <Session>
      <Suspense>
        <List {...params} modelName={modelName} model={model} admin={admin} />
      </Suspense>
    </Session>
  );
}

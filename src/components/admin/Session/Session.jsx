import React from "react";
import verifyJWT from "@admin/auth/verifyJWT";
import Revalidate from "./Revalidate";

import Suspense from "../Suspense";
const Login = React.lazy(() => import("../Login"));

// Faster client side authentication.
export default async function Session({ children }) {
  const claims = await verifyJWT("ADMIN");
  if (!claims) {
    return (
      <Suspense>
        <Login />
      </Suspense>
    );
  }

  const secondsRemaining = Math.round(claims.exp - Date.now() / 1000);

  if (secondsRemaining > thaumazoModels.sessionTimeout / 2) {
    return children;
  }

  return (
    <>
      <Revalidate />
      {children}
    </>
  );
}

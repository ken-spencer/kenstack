import { redirect } from "next/navigation";

// const Login = React.lazy(() => import("@admin/cms/Login"));

import Session from "@admin/server/Session";

// Deep authentication. Call this later to allow for some UI to be rendered.
export default async function Authenticate({ session, roles, children }) {
  const isAuthenticated = await session.isAuthenticated();
  if (!Array.isArray(roles) || roles.length === 0) {
    throw Error("An array of at least one roles must be specified");
  }

  if (!(session instanceof Session)) {
    throw Error("Authenticate request a session to be specified");
  }

  if (isAuthenticated === true) {
    return children;
  }

  redirect(session.loginPath);
}

import { redirect } from "next/navigation";

// const Login = React.lazy(() => import("@kenstack/cms/Login"));

import Session from "@kenstack/server/Session";

// Deep authentication. Call this later to allow for some UI to be rendered.
export default async function Authenticate({ session, roles, children }) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw Error("An array of at least one roles must be specified");
  }

  if (!(session instanceof Session)) {
    throw Error("Authenticate request a session to be specified");
  }

  if ((await session.hasRole(...roles)) !== true) {
    redirect(session.loginPath);
  }
  return children;

  /*
  const isAuthenticated = await session.isAuthenticated();
  if (isAuthenticated === true) {
  }

  redirect(session.loginPath);
  */
}

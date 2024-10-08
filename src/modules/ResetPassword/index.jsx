import "server-only";

import Form from "./Form";

import Session from "@kenstack/server/Session";

export default function ResetPassword({
  session,
  apiPath = "/api/reset-password",
}) {
  if (!(session instanceof Session)) {
    throw Error("A valid session must be specified");
  }

  return <Form apiPath={apiPath} />;
}

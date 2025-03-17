import "server-only";

import Form from "./Form";

import Session from "@kenstack/server/Session";

export default function ResetPassword({
  session,
  apiPath = "/reset-password/api",
  className,
  children,
}) {
  if (!(session instanceof Session)) {
    throw Error("A valid session must be specified");
  }

  return (
    <Form apiPath={apiPath} className={className}>
      {children}
    </Form>
  );
}

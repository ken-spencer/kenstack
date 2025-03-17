import Form from "./Form";
// import { redirect, notFound } from "next/navigation";

import { ForgottenPasswordProvider } from "./context";

import Session from "@kenstack/server/Session";

export default function ForgottenPassword({ session, className, children }) {
  if (!(session instanceof Session)) {
    throw Error("A valid session must be specified");
  }

  return (
    <ForgottenPasswordProvider
      loginPath={session.loginPath}
      apiPath={session.forgottenPasswordPath + "/api"}
    >
      <Form className={className}>{children}</Form>
    </ForgottenPasswordProvider>
  );
}

/*
  if (id) {
    if (!id.match(/^[A-Za-z0-9_-]{21}$/)) {
      notFound();
    }
    redirect(thaumazoAdmin.pathName("/api/forgotten-password/" + id));
  }
  */

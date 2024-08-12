import Form from "./Form";
// import { redirect, notFound } from "next/navigation";

import { ForgottenPasswordProvider } from "./context";

import Session from "@admin/server/Session";

export default function ForgottenPassword({ session }) {
  if (!(session instanceof Session)) {
    throw Error("A valid session must be specified");
  }

  return (
    <ForgottenPasswordProvider
      loginPath={session.loginPath}
      apiPath={session.forgottenPasswordPath + "/api"}
    >
      <Form />
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

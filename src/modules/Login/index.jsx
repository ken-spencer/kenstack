import Form from "./Form";

// import styles from "./page.module.css"

import Session from "@kenstack/server/Session";
import { LoginProvider } from "./context";

export default function Login({
  session,
  apiPath = "/login/api",
  className,
  children,
}) {
  if (!(session instanceof Session)) {
    throw Error("A valid session must be specified");
  }

  return (
    <div>
      <LoginProvider
        forgottenPasswordPath={session.forgottenPasswordPath}
        apiPath={apiPath}
      >
        <Form className={className}>{children}</Form>
      </LoginProvider>
    </div>
  );
}

export const metadata = {
  title: "Login",
};

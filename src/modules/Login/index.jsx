import Form from "./Form";

// import styles from "./page.module.css"

import Session from "@admin/server/Session";
import { LoginProvider } from "./context";

export default function Login({ session }) {
  if (!(session instanceof Session)) {
    throw Error("A valid session must be specified");
  }

  return (
    <div>
      <LoginProvider
        forgottenPasswordPath={session.forgottenPasswordPath}
        apiPath={session.loginPath + "/api"}
      >
        <Form />
      </LoginProvider>
    </div>
  );
}

export const metadata = {
  title: "Login",
};

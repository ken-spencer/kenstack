// import styles from "./page.module.css"
import { Main } from "../../";
import Form from "./ForgottenPassword";
import action from "./forgottenPasswordAction";

// import ForgottenPassword from "../../../models/ForgottenPassword";

// import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

export default function Login({ id }) {
  if (id) {
    if (!id.match(/^[A-Za-z0-9_-]{21}$/)) {
      notFound();
    }
    redirect(thaumazoAdmin.pathName("/api/forgotten-password/" + id));
  }

  return (
    <Main>
      <Form action={action} />
    </Main>
  );
}

export const metadata = {
  title: "Login",
};

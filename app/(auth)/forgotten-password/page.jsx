// import styles from "./page.module.css"
import { Main } from "@thaumazo/cms/components";
import Form from "@thaumazo/cms/components/ForgottenPasswordForm";
import action from "./action";

export default function Login() {
  return (
    <Main>
      <Form action={action} />
    </Main>
  );
}

export const metadata = {
  title: "Login",
};

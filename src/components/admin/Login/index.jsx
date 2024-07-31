import Form from "./LoginForm";

// import styles from "./page.module.css"
import { Main } from "@admin/components";

export default function Login() {
  return (
    <Main>
      <Form />
    </Main>
  );
}

export const metadata = {
  title: "Login",
};

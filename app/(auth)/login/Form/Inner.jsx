import Link from "next/link";
// import { experimental_useFormStatus as useFormStatus } from 'react-dom'

import { TextField, Password, Submit } from "@thaumazo/forms";
import Notice from "components/Notice";

import styles from "./form.module.css";

export default function LoginFormInner() {
  // const { notice } = useFormHandler(loginAction);

  return (
    <>
      <div className={styles.item}>
        <h1>Login</h1>
      </div>

      <div className={styles.errorItem}>
        <Notice />
      </div>

      <div className={styles.item}>
        <TextField name="email" type="email" required />
      </div>
      <div className={styles.item}>
        <Password name="password" required />
      </div>
      <div className={styles.item}>
        <Submit fullWidth>Sign in</Submit>
      </div>
      <div className={styles.item}>
        <Link href="/forgotten-password">Forgotten your password?</Link>
      </div>
    </>
  );
}

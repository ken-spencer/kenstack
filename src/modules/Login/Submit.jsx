import Link from "next/link";
import Submit from "@kenstack/forms/Submit";

import styles from "./login.module.css";
import { useLogin } from "./context";

export default function LoginSubmit() {
  const { forgottenPasswordPath } = useLogin();
  return (
    <div className={styles.buttonContainer}>
      <div className={styles.submit}>
        <Submit>Login</Submit>
      </div>
      <div className={styles.forgottenPassword}>
        <Link href={forgottenPasswordPath}>Forgotten your password?</Link>
      </div>
    </div>
  );
}

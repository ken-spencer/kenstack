import Link from "next/link";
import Submit from "@thaumazo/forms/Submit";

import styles from "./login.module.css";

export default function LoginSubmit() {
  return (
    <div className={styles.buttonContainer}>
      <div className={styles.submit}>
        <Submit>Login</Submit>
      </div>
      <div className={styles.forgottenPassword}>
        <Link href={thaumazoAdmin.pathName("/forgotten-password")}>
          Forgotten your password?
        </Link>
      </div>
    </div>
  );
}

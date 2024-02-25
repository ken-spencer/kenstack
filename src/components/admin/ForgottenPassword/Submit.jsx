import Link from "next/link";
import Submit from "@thaumazo/forms/Submit";

import styles from "./form.module.css";

export default function LoginSubmit() {
  return (
    <div className={styles.buttonContainer}>
      <div className={styles.submit}>
        <Submit>Request link</Submit>
      </div>
      <div className={styles.forgottenPassword}>
        <Link href={thaumazoAdmin.pathName("/login")}>Return to login</Link>
      </div>
    </div>
  );
}

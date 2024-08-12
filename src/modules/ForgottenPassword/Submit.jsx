import Link from "next/link";
import Submit from "@admin/forms/Submit";

import styles from "./form.module.css";

import { useForgottenPassword } from "./context";

export default function LoginSubmit() {
  const { loginPath } = useForgottenPassword();
  return (
    <div className={styles.buttonContainer}>
      <div className={styles.submit}>
        <Submit>Request link</Submit>
      </div>
      <div className={styles.forgottenPassword}>
        <Link href={loginPath}>Return to login</Link>
      </div>
    </div>
  );
}

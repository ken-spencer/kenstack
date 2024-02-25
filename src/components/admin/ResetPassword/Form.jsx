import resetPasswordAction from "../../../auth/resetPasswordAction";
import fields from "./fields";
import AutoForm from "@thaumazo/forms/AutoForm";

import authenticate from "../../../auth/authenticate";

export default async function ResetPasswordForm() {
  await authenticate();

  return (
    <div style={{ maxWidth: "500px" }}>
      <AutoForm
        title="Reset your password"
        description={
          <span>
            Type your new password here. Make sure it has at least 8 characters.
            It should have both big and small letters and also a number.
          </span>
        }
        fields={fields}
        action={resetPasswordAction}
      />
    </div>
  );

  /*
  return (
    <Form className={styles.container}>
      <div className={styles.item}>
        <p>
        </p>
      </div>

      <div className={styles.errorItem}>
        <Notice />
      </div>

      <div className={styles.item}>
        <Password name="password" required />
      </div>

      <div className={styles.item}>
        <Password name="confirm_password" matches="password" />
      </div>
      <div className={styles.item}>
        <Submit fullWidth>Update password</Submit>
      </div>
    </Form>
  );
  */
}

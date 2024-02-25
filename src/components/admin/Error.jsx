import styles from "./admin.module.scss";

import Alert from "@mui/material/Alert";

export default function Error({ message }) {
  return (
    <div className={styles.errorCont}>
      <Alert severity="error">{message}</Alert>
    </div>
  );
}

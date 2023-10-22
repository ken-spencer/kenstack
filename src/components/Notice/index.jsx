import Alert from "@mui/material/Alert";
import Fade from "@mui/material/Fade";

import styles from "./notice.module.css";

export default function Notice({ severity, children }) {
  return (
    <Fade in={true}>
      <Alert className={styles.notice} severity={severity}>
        {children}
      </Alert>
    </Fade>
  );
}

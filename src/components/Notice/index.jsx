import Alert from "@mui/material/Alert";
import Fade from "@mui/material/Fade";
import { Notice } from "@thaumazo/forms";

import styles from "./notice.module.css";

export default function NoticeWrapper({ error, ...props }) {
  if (error) {
    return (
      <Fade in={true}>
        <Alert className={styles.notice} severity="error">
          {error}
        </Alert>
      </Fade>
    );
  }

  return <Notice className={styles.notice} {...props} />;
}

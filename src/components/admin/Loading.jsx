import CircularProgress from "@mui/material/CircularProgress";
import styles from "./admin.module.scss";

export default function Loading() {
  return (
    <div className={styles.loadingCont}>
      <CircularProgress />
    </div>
  );
}

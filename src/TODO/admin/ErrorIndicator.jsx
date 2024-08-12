import styles from "./admin.module.scss";

import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function Loading() {
  return (
    <div className={styles.loadingCont}>
      <ErrorOutlineIcon
        sx={{
          color: "red",
          fontSize: "40px",
        }}
      />
    </div>
  );
}

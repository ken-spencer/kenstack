import styles from "./admin.module.scss";
import Typography from "@mui/material/Typography";
import LoadingIcon from "@mui/material/CircularProgress";

export default function AdminTitle({ modelName, loading, children = null }) {
  const admin = thaumazoAdmin.get(modelName);

  if (!children && !admin) {
    return null;
  }

  return (
    <div className={styles.toolbarMiddle}>
      <Typography sx={{ position: "relative" }} variant="h6" component="div">
        {children || admin.title}
        {loading ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: "-25px",
              bottom: 0,
              margin: "auto",
            }}
          >
            <LoadingIcon size={12} />
          </div>
        ) : null}
      </Typography>
    </div>
  );
}

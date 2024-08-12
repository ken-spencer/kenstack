import Typography from "@mui/material/Typography";
import LoadingIcon from "@mui/material/CircularProgress";

export default function AdminTitle({ modelName, loading, children = null }) {
  if (!children) {
    return null;
  }

  return (
    <div className="admin-toolbar-middle">
      <Typography sx={{ position: "relative" }} variant="h6" component="div">
        {children}
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

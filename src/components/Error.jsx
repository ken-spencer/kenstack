import Alert from "@mui/material/Alert";

export default function Error({ message }) {
  return (
    <div className="admin-error-cont">
      <Alert severity="error">{message}</Alert>
    </div>
  );
}

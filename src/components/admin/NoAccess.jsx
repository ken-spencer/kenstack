import Main from "../Main";
import Alert from "@mui/material/Alert";

export default function NoAccess() {
  return (
    <Main>
      <Alert severity="error">
        You do not have permission to access this page.
      </Alert>
    </Main>
  );
}

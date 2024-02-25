/**
 * You can use this component to setup your intial user. Be sure to remove it
 * from any production build as culd be a security risk.
 **/

// import saveAction from "./saveAction";

import Form from "./Form";
import Alert from "@mui/material/Alert";

export default async function AdminSetup() {
  const User = await thaumazoModels.get("User");
  const user = await User.findOne();

  if (user) {
    return (
      <Alert severity="error" color="success" variant="filled">
        An administrator has successfully been added. Please remove this
        component.
      </Alert>
    );
  }

  return <Form />;
}

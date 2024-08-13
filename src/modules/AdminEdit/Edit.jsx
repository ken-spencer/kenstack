// import authenticate from "../../../auth/authenticate";

// import Alert from "@mui/material/Alert";

import { AdminEditProvider } from "./context";
import AdminForm from "./Form";

import { useServer } from "@kenstack/server/context";

export default function AdminEdit({ admin }) {
  const { id, isNew, row, userId } = useServer();

  return (
    <AdminEditProvider admin={admin} isNew={isNew} id={id} row={row} userId={userId}>
      <AdminForm />
    </AdminEditProvider>
  );
}

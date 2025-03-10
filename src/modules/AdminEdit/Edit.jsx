import { AdminEditProvider } from "./context";

import AdminForm from "./Form";

import { useServer } from "@kenstack/server/context";

export default function AdminEdit({ admin }) {
  const { id, isNew, row, userId, previous, next } = useServer();
  return (
    <AdminEditProvider
      admin={admin}
      isNew={isNew}
      id={id}
      row={row}
      previous={previous}
      next={next}
      userId={userId}
    >
      <AdminForm />
    </AdminEditProvider>
  );
}

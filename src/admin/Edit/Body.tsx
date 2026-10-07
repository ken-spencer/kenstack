"use client";

import AdminEdit from "./AdminEdit";
import { useAdminEdit } from "./context";

// The module's own editor, or Kenstack's.
export default function EditBody() {
  const { client } = useAdminEdit();
  return client.Edit ? <client.Edit /> : <AdminEdit />;
}

"use client";

import AdminEdit from "./AdminEdit";
import { useAdminEdit } from "./context";

export default function EditBody() {
  const { client } = useAdminEdit();
  return client.Edit ? <client.Edit /> : <AdminEdit />;
}

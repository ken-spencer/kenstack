"use client";

import { useAdminEdit } from "./context";

export default function FormRender() {
  const {
    client: { EditForm },
  } = useAdminEdit();

  return <EditForm />;
}

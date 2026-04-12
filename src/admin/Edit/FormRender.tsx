"use client";

import type { AdminClient } from "@kenstack/admin";

export default function FormRender({
  client: { EditForm },
}: {
  client: AdminClient;
}) {
  return <EditForm />;
}

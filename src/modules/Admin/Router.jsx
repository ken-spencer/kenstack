import ListServer from "@kenstack/modules/AdminList/Server";
import EditServer from "@kenstack/modules/AdminEdit/Server";

import { notFound } from "next/navigation";

export default async function AdminRouter({
  ListClient,
  EditClient,
  params,
  ...props
}) {
  const { admin: adminParams } = await params;
  if (!adminParams) {
    return (
      <ListServer {...props}>
        <ListClient />
      </ListServer>
    );
  }

  const id = adminParams[0];
  if (id === "new" || id.match(/^[0-9a-fA-F]{24}$/)) {
    return (
      <EditServer id={id} {...props}>
        <EditClient />
      </EditServer>
    );
  }

  notFound();
}

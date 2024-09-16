import ListServer from "@kenstack/modules/AdminList/Server";
import EditServer from "@kenstack/modules/AdminEdit/Server";

import { notFound } from "next/navigation";

export default function AdminRouter({
  ListClient,
  EditClient,
  params,
  ...props
}) {
  if (!params.admin) {
    return (
      <ListServer {...props}>
        <ListClient />
      </ListServer>
    );
  }

  const id = params.admin[0];
  if (id === "new" || id.match(/^[0-9a-fA-F]{24}$/)) {
    return (
      <EditServer id={id} {...props}>
        <EditClient />
      </EditServer>
    );
  }

  notFound();
}

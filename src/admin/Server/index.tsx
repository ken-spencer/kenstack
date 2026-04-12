import { Suspense } from "react";
import { ServerProvider } from "./context";
// import merge from "lodash-es/merge";
import { notFound, redirect } from "next/navigation";
import AdminList from "@kenstack/admin/List";
import Edit from "@kenstack/admin/Edit";
import { deps } from "@app/deps";
import { AdminConfig } from "..";

type AdminServerProps = {
  context: {
    params: Promise<{ admin: [string, string?] }>;
  };
  adminConfig: AdminConfig;
};

export default function AdminServer(props: AdminServerProps) {
  return (
    <div>
      <Suspense>
        <AdminServerCore {...props} />
      </Suspense>
    </div>
  );
}

async function AdminServerCore({
  context: { params },
  adminConfig,
}: AdminServerProps) {
  const { admin: adminRoute } = await params;

  if (!Array.isArray(adminRoute)) {
    throw Error("/[...admin] routing structure is required for admin");
  }

  const [name, id] = adminRoute;

  if (id && id !== "new" && !id.match(/^[0-9]+$/)) {
    notFound();
  }
  const isNew = id === "new";

  const thrupple = adminConfig.find(([t]) => t === name);
  if (!thrupple) {
    notFound();
  }

  if ((await deps.auth.hasRole("admin")) !== true) {
    redirect("/login");
  }
  // const admin = thrupple[2] ? merge({}, thrupple[1], thrupple[2]) : thrupple[1];
  const adminTable = thrupple[1];
  const { icon: Icon, title } = adminTable;

  return (
    <ServerProvider name={name} id={isNew ? null : id} isNew={isNew}>
      <div className="text-md mx-auto mb-2 flex items-center justify-center gap-4 text-gray-700">
        {Icon && <Icon className="size-4 text-gray-800" />}
        <span className="font-bold">{title}</span>
      </div>
      {isNew || id ? (
        <Edit name={name} adminTable={adminTable} />
      ) : (
        <AdminList adminTable={adminTable} />
      )}
    </ServerProvider>
  );
}

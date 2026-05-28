import { Suspense } from "react";
import { notFound } from "next/navigation";
import AdminList from "@kenstack/admin/List";
import Edit from "@kenstack/admin/Edit";
import { deps } from "@app/deps";
import { type DefinedAdmin } from ".";

type AdminServerProps = {
  context: {
    params: Promise<{ admin: [string, string?] }>;
  };
  adminConfig: DefinedAdmin;
};

type AdminPageContext = AdminServerProps["context"];

export function createAdminPage({
  adminConfig,
}: {
  adminConfig: DefinedAdmin;
}) {
  return function AdminPage(context: AdminPageContext) {
    return <AdminServer context={context} adminConfig={adminConfig} />;
  };
}

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
  adminConfig: admin,
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

  const moduleConfig = admin[name];
  const adminConfig = moduleConfig?.admin;
  const clientConfig = moduleConfig?.client;
  if (!moduleConfig || !adminConfig || !clientConfig) {
    notFound();
  }

  const user = await deps.auth.requireUser("admin");
  const Icon = moduleConfig.icon;

  return (
    <div>
      <div className="text-md mx-auto flex items-center justify-center gap-4 text-gray-700">
        {Icon && <Icon className="size-4 text-gray-800" />}
        <span className="font-bold">{moduleConfig.title}</span>
      </div>
      {(() => {
        if ("list" in adminConfig) {
          if (!isNew && !id) {
            return (
              <AdminList
                name={name}
                adminConfig={adminConfig}
                clientConfig={clientConfig}
                userId={user.id}
              />
            );
          }

          return (
            <Edit
              id={id ? parseInt(id) : undefined}
              isNew={isNew}
              name={name}
              adminConfig={adminConfig}
              clientConfig={clientConfig}
              userId={user.id}
            />
          );
        }

        if (id) {
          notFound();
        }

        return (
          <Edit
            name={name}
            adminConfig={adminConfig}
            clientConfig={clientConfig}
            userId={user.id}
          />
        );
      })()}
    </div>
  );
}

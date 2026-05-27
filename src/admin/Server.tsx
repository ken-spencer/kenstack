import { Suspense } from "react";
import { notFound } from "next/navigation";
import AdminList from "@kenstack/admin/List";
import Edit from "@kenstack/admin/Edit";
import { deps } from "@app/deps";
import { type AdminDefinition } from ".";

type AdminServerProps = {
  context: {
    params: Promise<{ admin: [string, string?] }>;
  };
  admin: AdminDefinition;
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
  admin,
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

  const adminConfig = admin[name];
  if (!adminConfig || !adminConfig.records) {
    notFound();
  }

  const user = await deps.auth.requireUser("admin");
  const Icon = adminConfig.icon;

  return (
    <div>
      <div className="text-md mx-auto flex items-center justify-center gap-4 text-gray-700">
        {Icon && <Icon className="size-4 text-gray-800" />}
        <span className="font-bold">{adminConfig.title}</span>
      </div>
      {(() => {
        if (adminConfig.single === false) {
          if (!isNew && !id) {
            return (
              <AdminList
                name={name}
                adminConfig={adminConfig}
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
              userId={user.id}
            />
          );
        }

        if (id) {
          notFound();
        }

        return <Edit name={name} adminConfig={adminConfig} userId={user.id} />;
      })()}
    </div>
  );
}

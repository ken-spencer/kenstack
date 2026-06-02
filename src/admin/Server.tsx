import { Suspense } from "react";
import { notFound } from "next/navigation";
import Progress from "@kenstack/components/Progress";
import AdminList from "@kenstack/admin/List";
import Edit from "@kenstack/admin/Edit";
import { deps } from "@app/deps";

type AdminPageContext = {
  params: Promise<{ admin: [string, string?] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AdminServerProps = {
  context: AdminPageContext;
};

export function createAdminPage() {
  return function AdminPage(context: AdminPageContext) {
    return <AdminServer context={context} />;
  };
}

export default function AdminServer(props: AdminServerProps) {
  return (
    <div>
      <Suspense fallback={<Progress className="my-16" />}>
        <AdminServerCore {...props} />
      </Suspense>
    </div>
  );
}

async function AdminServerCore({
  context: { params, searchParams },
}: AdminServerProps) {
  const { admin: adminRoute } = await params;

  if (!Array.isArray(adminRoute)) {
    throw Error("/[...admin] routing structure is required for admin");
  }

  const [name, id] = adminRoute;

  if (id && id !== "new" && !/^\d+$/.test(id)) {
    notFound();
  }

  const isNew = id === "new";
  const parsedId = id && !isNew ? Number(id) : undefined;

  const moduleConfig = deps.modules[name];
  const adminConfig = moduleConfig?.admin;
  const clientConfig = moduleConfig?.client;

  if (!moduleConfig || !adminConfig || !clientConfig) {
    notFound();
  }

  const user = await deps.auth.requireUser("admin");
  const Icon = moduleConfig.icon;

  if (!("list" in adminConfig) && id) {
    notFound();
  }

  return (
    <div>
      <div className="text-md mx-auto mb-2 flex items-center justify-center gap-4 text-gray-700 md:hidden">
        {Icon && <Icon className="size-4 text-gray-800" />}
        <span className="font-bold">{moduleConfig.title}</span>
      </div>
      {"list" in adminConfig && !isNew && !id ? (
        <AdminList
          name={name}
          adminConfig={adminConfig}
          basePath={adminConfig.preview ? moduleConfig.basePath : undefined}
          clientConfig={clientConfig}
          searchParams={await searchParams}
          userId={user.id}
        />
      ) : (
        <Edit
          id={"list" in adminConfig ? parsedId : undefined}
          isNew={"list" in adminConfig ? isNew : undefined}
          name={name}
          adminConfig={adminConfig}
          clientConfig={clientConfig}
          userId={user.id}
        />
      )}
    </div>
  );
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import * as z from "zod";

import Progress from "@kenstack/components/Progress";
import AdminList from "@kenstack/admin/List";
import Edit from "@kenstack/admin/Edit";
import { deps } from "@app/deps";
import { pageRoute } from "@kenstack/pageRoute";

export function createAdminPage() {
  return pageRoute(
    {
      access: "admin",
      fallback: <Progress className="my-16" />,
      params: z
        .object({
          admin: z.tuple([
            z.string(),
            z
              .union([
                z.literal("new"),
                z
                  .string()
                  .regex(/^\d+$/)
                  .transform((id) => Number(id)),
              ])
              .optional(),
          ]),
        })
        .transform(({ admin: [name, id] }) => ({
          name,
          id: typeof id === "number" ? id : undefined,
          isNew: id === "new",
        })),
    },
    ({ params, searchIn, user }) => {
      const { name, id, isNew } = params;
      const moduleConfig = deps.modules[name];
      const adminConfig = moduleConfig?.admin;
      const clientConfig = moduleConfig?.client;

      if (!moduleConfig || !adminConfig || !clientConfig) {
        notFound();
      }

      if (!("list" in adminConfig) && id !== undefined) {
        notFound();
      }

      const Icon = moduleConfig.icon;

      return (
        <div>
          <div className="text-md mx-auto mb-2 flex items-center justify-center gap-4 text-gray-700 md:hidden">
            {Icon && <Icon className="size-4 text-gray-800" />}
            <span className="font-bold">{moduleConfig.title}</span>
          </div>
          <Suspense fallback={<Progress className="my-16" />}>
            {"list" in adminConfig && !isNew && id === undefined ? (
              <AdminList
                name={name}
                adminConfig={adminConfig}
                basePath={
                  adminConfig.preview ? moduleConfig.basePath : undefined
                }
                clientConfig={clientConfig}
                searchParams={searchIn}
                userId={user.id}
              />
            ) : (
              <Edit
                id={"list" in adminConfig ? id : undefined}
                isNew={"list" in adminConfig ? isNew : undefined}
                name={name}
                adminConfig={adminConfig}
                clientConfig={clientConfig}
                userId={user.id}
              />
            )}
          </Suspense>
        </div>
      );
    },
  );
}

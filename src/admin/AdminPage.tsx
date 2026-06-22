import { Suspense } from "react";
import { notFound } from "next/navigation";
import * as z from "zod";

import { Skeleton } from "@kenstack/components/Skeleton";
import AdminList from "@kenstack/admin/List";
import Edit from "@kenstack/admin/Edit";
import { deps } from "@app/deps";
import { pageRoute } from "@kenstack/pageRoute";

export function createAdminPage() {
  return pageRoute(
    {
      access: "admin",
      fallback: <AdminPageSkeleton />,
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
    async ({ params, searchIn, user }) => {
      const { name, id, isNew } = params;
      const moduleConfig = deps.modules[name];

      if (!moduleConfig?.admin) {
        notFound();
      }

      const adminConfig = moduleConfig.admin;
      const clients = moduleConfig.client ?? {};

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
          <Suspense fallback={<AdminPageSkeleton />}>
            {"list" in adminConfig && !isNew && id === undefined ? (
              <AdminList
                name={name}
                adminConfig={adminConfig}
                basePath={
                  adminConfig.preview ? moduleConfig.basePath : undefined
                }
                clients={clients}
                searchParams={searchIn}
                userId={user.id}
              />
            ) : (
              <Edit
                id={"list" in adminConfig ? id : undefined}
                isNew={"list" in adminConfig ? isNew : undefined}
                name={name}
                adminConfig={adminConfig}
                clients={clients}
                userId={user.id}
              />
            )}
          </Suspense>
        </div>
      );
    },
  );
}

function AdminPageSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-2 border-b pb-2">
        <Skeleton className="size-9" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
        </div>
      </div>
      <div className="divide-y border-y">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
          >
            <Skeleton className="size-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="hidden h-5 w-20 sm:block" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="size-7" />
          <Skeleton className="size-7" />
          <Skeleton className="size-7" />
        </div>
      </div>
    </div>
  );
}

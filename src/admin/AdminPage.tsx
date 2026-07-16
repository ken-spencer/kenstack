import { Suspense } from "react";
import { notFound } from "next/navigation";
import * as z from "zod";

import { Skeleton } from "@kenstack/components/Skeleton";
import AdminList from "@kenstack/admin/List";
import Edit from "@kenstack/admin/Edit";
import { deps } from "@app/deps";
import { pageRoute } from "@kenstack/pageRoute";
import { parseAdminRouteSegments } from "@kenstack/admin/lib/route";

const adminRouteSchema = z.array(z.string()).transform((segments, ctx) => {
  const route = parseAdminRouteSegments(segments);

  if (!route) {
    ctx.addIssue({
      code: "custom",
      message: "Invalid admin route.",
    });

    return z.NEVER;
  }

  return route;
});

export function createAdminPage() {
  return pageRoute(
    {
      access: "admin",
      fallback: <AdminPageSkeleton />,
      params: z
        .object({
          admin: adminRouteSchema,
        })
        .transform(({ admin }) => admin),
    },
    async ({ params, searchIn, user }) => {
      const { name, id, isNew = false, parentId } = params;
      const moduleConfig = deps.modules[name];

      if (!moduleConfig?.admin) {
        notFound();
      }

      const moduleParent = moduleConfig.parent;

      if (parentId) {
        if (!moduleParent) {
          notFound();
        }

        const parentModuleConfig = deps.modules[moduleParent.module];

        if (!parentModuleConfig?.admin) {
          notFound();
        }
      } else if (moduleParent && (id === undefined || isNew)) {
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
          <div className="text-md text-muted-foreground mx-auto mb-2 flex items-center justify-center gap-4 md:hidden">
            {Icon && <Icon className="text-foreground size-4" />}
            <span className="font-bold">{moduleConfig.title}</span>
          </div>
          <Suspense fallback={<AdminPageSkeleton />}>
            {"list" in adminConfig && !isNew && id === undefined ? (
              <AdminList
                name={name}
                moduleTitle={moduleConfig.title}
                adminConfig={adminConfig}
                basePath={
                  adminConfig.preview ? moduleConfig.basePath : undefined
                }
                clients={clients}
                searchParams={searchIn}
                userId={user.id}
                parentId={parentId}
                moduleParent={moduleParent}
              />
            ) : (
              <Edit
                id={"list" in adminConfig ? id : undefined}
                isNew={"list" in adminConfig ? isNew : undefined}
                name={name}
                moduleTitle={moduleConfig.title}
                adminConfig={adminConfig}
                clients={clients}
                moduleParent={moduleParent}
                parentId={parentId}
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
      <div className="border-border/50 flex items-center gap-2 border-b pb-2">
        <Skeleton className="size-9" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
        </div>
      </div>
      <div className="divide-border/50 border-border/50 divide-y border-y">
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

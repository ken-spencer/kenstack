import { geolocation } from "@vercel/functions";
import { headers } from "next/headers";

import { db as appDb } from "@app/db";
import { getCurrentUser } from "@kenstack/auth/server/user";
import { auditLogs } from "@kenstack/db/tables/audit";
import getIp from "@kenstack/lib/ip";

export async function audit({
  db = appDb,
  userId,
  ...props
}: {
  action: string;
  data?: Record<string, unknown>;
  db?: {
    insert: (table: typeof auditLogs) => {
      values: (values: typeof auditLogs.$inferInsert) => PromiseLike<unknown>;
    };
  };
  rowId?: number | null;
  table?: string;
  userId?: number | null;
}): Promise<void> {
  const user = userId === null ? null : await getCurrentUser();
  const headersList = await headers();
  const request = new Request("http://internal", { headers: headersList });

  await db.insert(auditLogs).values({
    ...props,
    userId: userId === undefined ? (user?.id ?? null) : userId,
    impersonatedBy: user?.impersonatedBy ?? null,
    geo: geolocation(request),
    ipAddress: await getIp(request),
    pathname: headersList.get("x-pathname") ?? null,
    userAgent: headersList.get("user-agent"),
  });
}

import { type AuditLogger } from "@kenstack/logger/types";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { geolocation } from "@vercel/functions";

import { headers } from "next/headers";
import { auditLogs } from "@server/db/schema";
// import { getCurrentOrganization } from "@server/db/loaders/organizations";

export const createAuditLogger =
  <TSchema extends Record<string, unknown>>(
    db: PostgresJsDatabase<TSchema>
  ): AuditLogger =>
  async (props) => {
    const headersList = await headers();
    const geo = geolocation(
      new Request("http://internal", { headers: headersList })
    );
    const userAgent = headersList.get("user-agent");
    const ipAddress = headersList.get("x-real-ip") ?? "127.0.0.1";
    const pathname = headersList.get("x-pathname") ?? null;
    // const org = await getCurrentOrganization();
    await db.insert(auditLogs).values({
      ...props,
      // orgId: org ? org.id : null,
      geo,
      ipAddress,
      userAgent,
      pathname,
    });
  };

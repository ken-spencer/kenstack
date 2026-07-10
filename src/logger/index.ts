import { geolocation } from "@vercel/functions";
import { headers } from "next/headers";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { auditLogs } from "@kenstack/db/tables/audit";

type LoggerAuth = {
  getCurrentUser: () => Promise<
    | {
        id: number;
        impersonatedBy?: number | null;
      }
    | undefined
  >;
};

type AuditProps = (
  | {
      userId?: number | null;
      isSystem?: never;
    }
  | {
      isSystem: boolean;
      userId?: never;
    }
) & {
  action: string;
  table?: string;
  rowId?: number | null;
  data?: Record<string, unknown>;
};

export class Logger<TSchema extends Record<string, unknown>> {
  db: PostgresJsDatabase<TSchema>;
  auth?: LoggerAuth;

  constructor({ db }: { db: PostgresJsDatabase<TSchema> }) {
    this.db = db;
  }

  bindAuth(auth: LoggerAuth) {
    this.auth = auth;
  }

  async audit({ userId, ...props }: AuditProps) {
    if (!this.auth) {
      throw Error("bindAuth must be bound to the logger");
    }

    const headersList = await headers();
    const geo = geolocation(
      new Request("http://internal", { headers: headersList }),
    );
    const userAgent = headersList.get("user-agent");
    const ipAddress = headersList.get("x-real-ip") ?? "127.0.0.1";
    const pathname = headersList.get("x-pathname") ?? null;

    const user = props.isSystem ? null : await this.auth.getCurrentUser();

    await this.db.insert(auditLogs).values({
      ...props,
      userId: userId ?? user?.id,
      impersonatedBy: user?.impersonatedBy ?? null,
      geo,
      ipAddress,
      userAgent,
      pathname,
    });
  }
}

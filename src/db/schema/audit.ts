import {
  integer,
  pgTable,
  text,
  jsonb,
  timestamp,
  varchar,
  index,
  inet,
  boolean,
} from "drizzle-orm/pg-core";
// import { organizations } from "./organizations";
// import { users } from "./users";
import { type Geo } from "@vercel/functions";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    orgId: integer("org_id"),
    userId: integer("user_id"),
    isSystem: boolean("is_system").default(false).notNull(),

    action: varchar("action", { length: 64 }).notNull(),

    entityType: varchar("entity_type", { length: 64 }),
    entityId: integer("entity_id"),

    pathname: text("pathname"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    geo: jsonb("geo").$type<Geo>(),

    data: jsonb("data").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("audit_logs_org_id_idx").on(t.orgId),
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ]
);

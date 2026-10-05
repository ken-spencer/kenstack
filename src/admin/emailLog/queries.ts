import "server-only";

import {
  and,
  count,
  eq,
  getTableColumns,
  getTableName,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import startCase from "lodash-es/startCase";

import { db } from "@app/db";
import { modules } from "@app/modules";
import { isAdminListModule } from "@kenstack/admin/module";
import { verificationEmailKind } from "@kenstack/auth/email/verification/sendCode";
import type { AdminFilters, AdminSort } from "@kenstack/admin/types/list";
import { emailMessages } from "@kenstack/db/tables/emailMessages";
import type { ListQuery } from "@kenstack/list/querySchema";
import { resolveFilters, resolveListOrderBy } from "@kenstack/list/server";
import { emailStatusLabels } from "./StatusBadge";

const pageSize = 50;

// A send still `sending` a few minutes on never reported its outcome.
const isUnconfirmed = sql<boolean>`(${emailMessages.status} = 'sending' and ${emailMessages.createdAt} < now() - interval '5 minutes')`;

export const emailLogSort = {
  createdAt: {
    label: "Sent",
    fields: [emailMessages.createdAt],
    defaultDirection: "desc",
  },
  updatedAt: {
    label: "Last activity",
    fields: [emailMessages.updatedAt],
    defaultDirection: "desc",
  },
  to: {
    label: "To",
    fields: [emailMessages.to],
    defaultDirection: "asc",
  },
} satisfies AdminSort;

// The kinds come from the log itself, since each sender names its own.
export async function loadEmailLogFilters() {
  const kinds = await db
    .selectDistinct({ kind: emailMessages.kind })
    .from(emailMessages)
    .orderBy(emailMessages.kind);

  return {
    // Messages staff can follow up.
    attention: {
      label: "Needs attention",
      kind: "boolean",
      field: sql`((${emailMessages.status} in ('failed', 'bounced') or ${isUnconfirmed}) and ${emailMessages.kind} <> ${verificationEmailKind})`,
    },
    status: {
      label: "Status",
      kind: "enum",
      field: emailMessages.status,
      options: Object.entries(emailStatusLabels).map(([value, label]) => ({
        value,
        label,
      })),
    },
    kind: {
      label: "Kind",
      kind: "enum",
      field: emailMessages.kind,
      options: kinds.map(({ kind }) => ({
        value: kind,
        label: startCase(kind),
      })),
    },
    createdAt: {
      label: "Created",
      kind: "date-range",
      field: emailMessages.createdAt,
    },
  } satisfies AdminFilters;
}

export async function listEmailMessages(
  query: ListQuery,
  filters: AdminFilters,
) {
  const where = and(
    ...resolveFilters(filters, query.filters),
    ...query.keywords
      .split(/\s+/)
      .filter(Boolean)
      .map((term) =>
        or(
          ilike(emailMessages.to, `%${term}%`),
          ilike(emailMessages.subject, `%${term}%`),
          eq(emailMessages.sesMessageId, term),
        ),
      ),
  );
  const [messages, [{ total }]] = await Promise.all([
    db
      .select({
        id: emailMessages.id,
        to: emailMessages.to,
        subject: emailMessages.subject,
        kind: emailMessages.kind,
        status: emailMessages.status,
        error: emailMessages.error,
        createdAt: emailMessages.createdAt,
        isUnconfirmed,
      })
      .from(emailMessages)
      .where(where)
      .orderBy(
        ...resolveListOrderBy(
          { sort: emailLogSort, table: emailMessages },
          query,
        ),
      )
      .limit(pageSize)
      .offset((query.page - 1) * pageSize),
    db.select({ total: count() }).from(emailMessages).where(where),
  ]);

  return {
    messages: messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
    total,
    pageSize,
  };
}

export async function loadEmailMessage(id: number) {
  const [message] = await db
    .select({ ...getTableColumns(emailMessages), isUnconfirmed })
    .from(emailMessages)
    .where(eq(emailMessages.id, id));
  return message;
}

// The list module that edits the table an email's record is in, which gives the record's admin page.
export function findRecordModule(table: string) {
  return Object.values(modules).find(
    (moduleConfig) =>
      isAdminListModule(moduleConfig) &&
      getTableName(moduleConfig.admin.table) === table,
  );
}

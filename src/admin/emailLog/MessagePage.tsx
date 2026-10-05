import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import startCase from "lodash-es/startCase";

import { dateFormat } from "@kenstack/lib/dateFormat";
import type { ListSearchParams } from "@kenstack/list/querySchema";
import { findRecordModule, loadEmailMessage } from "./queries";
import StatusBadge from "./StatusBadge";

// One Email Log message: when it was sent, its outcome and the record it is about.
export default async function EmailMessagePage({
  id,
  search,
}: {
  id: number;
  // The list's query, kept for the way back.
  search: ListSearchParams;
}) {
  const message = await loadEmailMessage(id);
  if (!message) {
    notFound();
  }
  const recordModule = message.table
    ? findRecordModule(message.table)
    : undefined;

  return (
    <div className="space-y-4 py-2">
      <Link
        className="text-muted-foreground inline-flex items-center gap-1 text-sm"
        href={{ pathname: "/admin/email-log", query: search }}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Email Log
      </Link>
      <h1 className="text-2xl font-semibold break-words">{message.subject}</h1>
      <dl className="grid max-w-2xl grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
        <Detail label="Outcome">
          <StatusBadge
            isUnconfirmed={message.isUnconfirmed}
            status={message.status}
          />
        </Detail>
        {message.error ? <Detail label="Reason">{message.error}</Detail> : null}
        <Detail label="To">{message.to}</Detail>
        <Detail label="From">{message.from}</Detail>
        <Detail label="Kind">{startCase(message.kind)}</Detail>
        {message.table && message.rowId !== null ? (
          <Detail label="Record">
            {recordModule ? (
              <Link href={`/admin/${recordModule.name}/${message.rowId}`}>
                {recordModule.title} #{message.rowId}
              </Link>
            ) : (
              `${startCase(message.table)} #${message.rowId}`
            )}
          </Detail>
        ) : null}
        <Detail label="Created">{dateFormat(message.createdAt)}</Detail>
        {message.sentAt ? (
          <Detail label="Accepted by SES">{dateFormat(message.sentAt)}</Detail>
        ) : null}
        <Detail label="Last activity">{dateFormat(message.updatedAt)}</Detail>
        {message.sesMessageId ? (
          <Detail label="SES message ID">
            <span className="break-all">{message.sesMessageId}</span>
          </Detail>
        ) : null}
      </dl>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

import { PgDialect, timestamp } from "drizzle-orm/pg-core";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defineTable } from "@kenstack/admin/table";
import { resolveListWhere } from "@kenstack/list/server";

const records = defineTable({
  name: "date_filter_records",
  columns: { happenedAt: timestamp("happened_at", { withTimezone: true }) },
});
const filters = {
  happenedAt: {
    label: "Happened",
    kind: "date-range" as const,
    field: records.happenedAt,
  },
};

function resolveDateParameters(range: { from?: string; to?: string }) {
  return resolveListWhere(
    { filters, searchable: [], table: records },
    {
      filters: { happenedAt: range },
      keywords: "",
      trash: false,
    },
  )
    .slice(1)
    .flatMap((condition) => new PgDialect().sqlToQuery(condition).params);
}

it("binds a calendar-date range to the same inclusive UTC day", () => {
  expect(
    resolveDateParameters({ from: "2026-09-01", to: "2026-09-01" }),
  ).toEqual(["2026-09-01T00:00:00.000Z", "2026-09-01T23:59:59.999Z"]);
});

it("keeps legacy timestamp parsing and local end-of-day behavior", () => {
  const timestamp = new Date(2026, 8, 1, 12, 34, 56).toISOString();
  expect(
    resolveDateParameters({
      from: timestamp,
      to: timestamp,
    }),
  ).toEqual([timestamp, new Date(2026, 8, 1, 23, 59, 59, 999).toISOString()]);
});

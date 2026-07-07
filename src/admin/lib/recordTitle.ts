import type { AnyColumn } from "drizzle-orm";

const adminRecordTitleKeys = ["title", "name", "slug"] as const;

export function getAdminRecordTitle(
  values: Record<string, unknown> | null | undefined,
) {
  for (const key of adminRecordTitleKeys) {
    const value = values?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export function getAdminRecordTitleSelect(columns: Record<string, AnyColumn>) {
  const select: Record<string, AnyColumn> = {};

  for (const key of adminRecordTitleKeys) {
    const column = columns[key];

    if (column) {
      select[key] = column;
    }
  }

  return select;
}

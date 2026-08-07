import { sql, type AnyColumn, type SQL } from "drizzle-orm";

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

export function getAdminRecordTitleSql(
  columns: Record<string, AnyColumn>,
  id: AnyColumn,
  moduleTitle: string,
): SQL {
  const titleColumns = Object.values(getAdminRecordTitleSelect(columns));
  const fallback = sql`concat(cast(${moduleTitle + " #"} as text), ${id})`;

  return titleColumns.length
    ? sql`coalesce(${sql.join(
        titleColumns.map(
          (column) => sql`nullif(btrim(cast(${column} as text)), '')`,
        ),
        sql`, `,
      )}, ${fallback})`
    : fallback;
}

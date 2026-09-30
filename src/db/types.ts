import type { db } from "@app/db";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

export type Database = typeof db;

export type DbTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export type NumericIdTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
};

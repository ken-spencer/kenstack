import { sql } from "drizzle-orm";
import { jsonb, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { defineTable } from "@kenstack/admin/table";
import type { RateValue } from "./fields/rates";

export const taxRegions = defineTable({
  name: "tax_regions",
  columns: {
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    regionCode: varchar("region_code", { length: 64 }).notNull(),
    rates: jsonb("rates").$type<RateValue[]>().notNull().default([]),
  },
  extraConfig: (t) => [
    uniqueIndex("tax_regions_country_region_unique_active")
      .on(t.countryCode, t.regionCode)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
});

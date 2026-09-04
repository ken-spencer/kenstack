import { integer, text } from "drizzle-orm/pg-core";

import { defineKeyTable } from "@kenstack/admin/table";

export const siteSettingsColumns = {
  title: text("title").notNull(),
  titleTemplate: text("title_template").notNull(),
  ogImage: integer("og_image"),
};

export const siteSettings = defineKeyTable({
  name: "site_settings",
  columns: siteSettingsColumns,
});

import "server-only";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { eq, getTableColumns } from "drizzle-orm";

import { modules } from "@app/modules";
import { selectMediaSubquery } from "@kenstack/db/queries/media";
import { query } from "@kenstack/db/queries/query";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";

// Reads the site-settings module the site registered, so a site that extends Kenstack's columns gets
// its own settings too. Without a saved row, the fields' defaults stand in.
export async function loadSiteSettings() {
  "use cache: remote";
  cacheLife("max");
  cacheTag("site-settings");

  const { fields, table } = modules["site-settings"].admin;
  // Destructured rather than omitted: omit() folds the columns into the table type's string index.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, key, createdBy, createdAt, updatedAt, ...columns } =
    getTableColumns(table);
  const [row] = await query(table)
    .select({ ...columns, ogImage: selectMediaSubquery(table.ogImage) })
    .where(eq(table.key, "site-settings"))
    .build()
    .limit(1);

  return row ?? { ...createDefaultValues(fields), ogImage: null };
}

export async function loadSiteSettingsMetadata() {
  const settings = await loadSiteSettings();

  return {
    title: settings.titleTemplate
      ? {
          default: settings.title,
          template: settings.titleTemplate,
        }
      : settings.title,
    openGraph: settings.ogImage?.url
      ? {
          images: [
            {
              url: settings.ogImage.url,
              width: settings.ogImage.width ?? 1200,
              height: settings.ogImage.height ?? 630,
              alt: settings.ogImage.alt ?? settings.title,
            },
          ],
        }
      : undefined,
  } satisfies Metadata;
}

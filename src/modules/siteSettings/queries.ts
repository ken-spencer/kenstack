import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";

import { deps } from "@app/deps";
import { selectImageSubquery } from "@kenstack/db/tables";
import { fields } from "./fields";
import { siteSettings } from "./tables";

export async function loadSiteSettings() {
  "use cache";
  cacheLife("max");
  cacheTag("site-settings");

  const [row] = await deps.db
    .select({
      title: siteSettings.title,
      titleTemplate: siteSettings.titleTemplate,
      ogImage: selectImageSubquery(siteSettings.ogImage, "original"),
    })
    .from(siteSettings)
    .where(eq(siteSettings.key, "site-settings"))
    .limit(1);

  if (row) {
    return row;
  }

  return {
    title: String(fields.title.default),
    titleTemplate: String(fields.titleTemplate.default),
    ogImage: null,
  };
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

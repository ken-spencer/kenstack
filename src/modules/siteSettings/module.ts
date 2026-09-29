/*
 * Public entry point: defineSiteSettingsModule, how Kenstack and host sites define the site-settings
 * module that loadSiteSettings reads. A site extends Kenstack's columns and fields, then passes them.
 */

import { Settings } from "lucide-react";

import type { AdminConfig } from "@kenstack/admin/module";
import { defineModule } from "@kenstack/admin/server";
import type { AdminKeyTable } from "@kenstack/admin/table";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";

export function defineSiteSettingsModule<
  const TTable extends AdminKeyTable,
  const TFields extends ServerDefinedFields,
>({ admin }: { admin: AdminConfig<TTable, TFields> }) {
  return defineModule({
    name: "site-settings",
    title: "Site Settings",
    icon: Settings,
    admin,
  });
}

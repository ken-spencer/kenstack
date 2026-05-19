import { Settings } from "lucide-react";

import { adminConfig } from "@kenstack/admin/config";
import client from "./client";
import { fields } from "./fields";
import { siteSettings } from "./tables";

export default adminConfig({
  title: "Site Settings",
  icon: Settings,
  client,
  fields,
  table: siteSettings,
  key: "site-settings",
  revalidate: ["site-settings"],
});

import { Settings } from "lucide-react";

import { defineModule } from "@kenstack/admin";
import client from "./client";
import { fields } from "./fields";
import { siteSettings } from "./tables";

export default defineModule({
  name: "siteSettings",
  title: "Site Settings",
  icon: Settings,
  client,
  fields,
  table: siteSettings,
  revalidate: ["site-settings"],
});

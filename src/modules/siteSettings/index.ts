import { Settings } from "lucide-react";

import { defineModule } from "@kenstack/admin/server";
import { fields } from "./fields";
import { siteSettings } from "./tables";

export default defineModule({
  name: "site-settings",
  title: "Site Settings",
  icon: Settings,
  admin: {
    fields,
    table: siteSettings,
    revalidate: ["site-settings"],
  },
});

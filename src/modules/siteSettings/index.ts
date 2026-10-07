import client from "./client";
import { fields } from "./fields";
import { defineSiteSettingsModule } from "./module";
import { siteSettings } from "./tables";

export default defineSiteSettingsModule({
  client,
  admin: { fields, table: siteSettings },
});

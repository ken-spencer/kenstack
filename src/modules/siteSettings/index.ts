import { fields } from "./fields";
import { defineSiteSettingsModule } from "./module";
import { siteSettings } from "./tables";

export default defineSiteSettingsModule({
  admin: { fields, table: siteSettings },
});

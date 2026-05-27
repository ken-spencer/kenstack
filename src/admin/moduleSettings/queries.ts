import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { ResolvedModuleSettingsConfig } from "@kenstack/admin";
import { loadRecord } from "@kenstack/fields/records";

export async function loadModuleSettings(
  name: string,
  settings: ResolvedModuleSettingsConfig,
) {
  "use cache";
  cacheTag("module-settings:" + name);
  cacheLife("max");

  return (
    await loadRecord({
      table: settings.table,
      fields: settings.fields,
      defaults: settings.defaultValues,
      query: async ({ db, select }) => {
        const [row] = await db
          .select(select)
          .from(settings.table)
          .where(eq(settings.table.key, name))
          .limit(1);

        return row;
      },
    })
  ).values;
}

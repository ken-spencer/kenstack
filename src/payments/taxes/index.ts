import { Percent } from "lucide-react";
import { defineModule } from "@kenstack/admin/server";
import { fields } from "./fields";
import { taxRegions } from "./tables";

// Host module registries supply their product categories.
export default function createTaxes(
  taxCategories: Parameters<typeof fields>[0],
) {
  return defineModule({
    name: "taxes",
    icon: Percent,
    admin: {
      fields: fields(taxCategories),
      revalidate: ["taxes"],
      table: taxRegions,
      list: {
        sort: {
          region: {
            fields: ["countryCode", "regionCode"] as const,
          },
        },
      },
    },
  });
}

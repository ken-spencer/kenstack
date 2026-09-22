"use client";

import { defineClient } from "@kenstack/admin/client";

import EditForm from "./components/EditForm";
import { TaxRegionListItem } from "./components/ListItems";
import { fields } from "./fields";

// Host client registries supply the same categories as the server module.
export default function createTaxesClient(
  taxCategories: Parameters<typeof fields>[0],
) {
  return defineClient({
    admin: {
      fields: fields(taxCategories),
      listItems: [[TaxRegionListItem]],
      EditForm: () => <EditForm taxCategories={taxCategories} />,
    },
  });
}

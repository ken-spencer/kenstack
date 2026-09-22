"use client";

import ListTitle from "@kenstack/admin/components/ListTitle";
import type { ListItemRow } from "@kenstack/admin/client";
import MetaDates from "@kenstack/admin/components/MetaDates";
import {
  formatSupportedRegion,
  formatSupportedRegionCode,
} from "@kenstack/fields/address/countries";

export function TaxRegionListItem(
  row: ListItemRow<{
    countryCode?: string | null;
    regionCode?: string | null;
  }>,
) {
  return (
    <ListTitle
      path={row.path}
      title={
        formatSupportedRegion(row.countryCode, row.regionCode) ||
        `Tax Region ${row.id}`
      }
    >
      <span>{formatSupportedRegionCode(row.countryCode, row.regionCode)}</span>
      <MetaDates record={row} />
    </ListTitle>
  );
}

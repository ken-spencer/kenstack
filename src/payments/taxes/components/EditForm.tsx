"use client";

import TaxRegionFields from "./TaxRegionFields";
import TaxRatesField from "../fields/rates/Component";
import type { ratesField } from "../fields/rates";

export default function EditForm({
  taxCategories,
}: {
  taxCategories: Parameters<typeof ratesField>[0];
}) {
  return (
    <div className="max-w-4xl space-y-5">
      <TaxRegionFields />
      <TaxRatesField name="rates" taxCategories={taxCategories} />
    </div>
  );
}

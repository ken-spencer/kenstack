"use client";

import { useFormContext } from "react-hook-form";

import { ComboboxField } from "@kenstack/admin/forms";
import {
  findSupportedCountry,
  findSupportedRegion,
  supportedCountries,
} from "@kenstack/fields/address/countries";

export default function TaxRegionFields() {
  const { setValue, watch } = useFormContext();
  const countryCode = watch("countryCode");
  const regionCode = watch("regionCode");
  const selectedCountry = findSupportedCountry(
    supportedCountries,
    typeof countryCode === "string" ? countryCode.toUpperCase() : "",
  );

  return (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <ComboboxField
        name="countryCode"
        label="Country"
        inputAutoComplete="new-password"
        emptyMessage="No countries found."
        options={supportedCountries.map((country) => ({
          value: country.code,
          label: country.name,
        }))}
        placeholder="Select country"
        onChange={(nextCountryCode) => {
          setValue(
            "regionCode",
            findSupportedRegion(
              findSupportedCountry(supportedCountries, nextCountryCode),
              typeof regionCode === "string" ? regionCode : "",
            )?.code ?? "",
            {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            },
          );
        }}
      />
      <ComboboxField
        name="regionCode"
        label={selectedCountry?.regionLabel ?? "Region"}
        inputAutoComplete="new-password"
        disabled={!selectedCountry}
        emptyMessage={`No ${(
          selectedCountry?.regionLabel ?? "region"
        ).toLowerCase()} found.`}
        options={(selectedCountry?.regions ?? []).map((region) => ({
          value: region.code,
          label: region.name,
        }))}
        placeholder={`Select ${(
          selectedCountry?.regionLabel ?? "region"
        ).toLowerCase()}`}
      />
    </div>
  );
}

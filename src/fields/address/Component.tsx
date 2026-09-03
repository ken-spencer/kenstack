"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import type { CountryData } from "country-region-data";
import { twMerge } from "tailwind-merge";

import {
  findSupportedCountry,
  getAddressLabels,
  type SupportedCountry,
} from "./countries";
import ComboboxField from "@kenstack/forms/ComboboxField";
import InputField from "@kenstack/forms/InputField";

const countryPriority = ["US", "CA"];

function orderCountries(countries: CountryData[]) {
  const options: SupportedCountry[] = countries.map(([name, code, regions]) => {
    return {
      code,
      name,
      ...getAddressLabels(code),
      regions: regions.map(([regionName, regionCode]) => ({
        code: regionCode,
        name: regionName,
      })),
    };
  });

  return [
    ...countryPriority
      .map((code) => options.find((country) => country.code === code))
      .filter((country): country is SupportedCountry => Boolean(country)),
    ...options.filter((country) => !countryPriority.includes(country.code)),
  ];
}

function normalizeRegionSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function findRegion(country: SupportedCountry | undefined, value: string) {
  const searchValue = normalizeRegionSearch(value);

  if (!country?.regions.length || !searchValue) {
    return null;
  }

  return (
    country.regions.find(
      (region) =>
        normalizeRegionSearch(region.code) === searchValue ||
        normalizeRegionSearch(region.name) === searchValue,
    ) ?? null
  );
}

export default function AddressFields({
  className,
  countries,
  title = "Address",
}: {
  className?: string;
  countries?: readonly SupportedCountry[];
  title?: ReactNode;
}) {
  const { setValue, watch } = useFormContext();
  const [loadedCountries, setLoadedCountries] = useState<SupportedCountry[]>(
    [],
  );
  const regionDrafts = useRef<Record<string, string>>({});
  const countryOptions = countries ?? loadedCountries;
  const countryCode = watch("countryCode");
  const regionCode = watch("regionCode");
  const selectedCountryCode =
    typeof countryCode === "string" ? countryCode.toUpperCase() : "";
  const selectedCountry = findSupportedCountry(
    countryOptions,
    selectedCountryCode,
  );
  const labels = selectedCountry ?? getAddressLabels("");

  useEffect(() => {
    if (countries) {
      return;
    }

    void import("country-region-data").then(({ allCountries }) => {
      setLoadedCountries(orderCountries(allCountries));
    });
  }, [countries]);

  return (
    <section className={twMerge("space-y-4", className)}>
      {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <InputField
          autoComplete="address-line1"
          name="addressLine1"
          label="Address"
        />
        <InputField
          autoComplete="address-line2"
          name="addressLine2"
          label="Address 2"
          placeholder="Apt, suite, unit"
        />
      </div>
      {/* Country must stay ahead of the region and postal fields: their
          options and labels follow the selected country. */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <InputField
          autoComplete="address-level2"
          name="locality"
          label={labels.localityLabel}
        />
        <ComboboxField
          name="countryCode"
          label="Country"
          disabled={!countryOptions.length}
          emptyMessage="No countries found."
          inputAutoComplete="country-name"
          placeholder="Select country"
          onChange={(nextCountryCode) => {
            const currentRegion =
              typeof regionCode === "string" ? regionCode : "";
            const nextCountry = findSupportedCountry(
              countryOptions,
              nextCountryCode,
            );
            const nextRegion =
              regionDrafts.current[nextCountryCode] ??
              findRegion(nextCountry, currentRegion)?.code ??
              (nextCountry?.regions.length ? "" : currentRegion);

            regionDrafts.current[selectedCountryCode] = currentRegion;
            setValue("regionCode", nextRegion, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
          }}
          options={countryOptions.map((country) => ({
            value: country.code,
            label: country.name,
          }))}
        />
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2">
        {selectedCountry?.regions.length ? (
          <ComboboxField
            name="regionCode"
            label={labels.regionLabel}
            emptyMessage={`No ${labels.regionLabel.toLowerCase()} found.`}
            inputAutoComplete="address-level1"
            placeholder={`Select ${labels.regionLabel.toLowerCase()}`}
            options={selectedCountry.regions.map((region) => ({
              value: region.code,
              label: region.name,
            }))}
          />
        ) : (
          <InputField
            autoComplete="address-level1"
            name="regionCode"
            label={labels.regionLabel}
          />
        )}
        <InputField
          autoComplete="postal-code"
          name="postalCode"
          label={labels.postalCodeLabel}
          maxLength={32}
          inputClass={selectedCountryCode ? "uppercase" : undefined}
          onBlur={({ event, field }) => {
            field.onChange(event.target.value.toUpperCase().trim());
          }}
        />
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import type { CountryData } from "country-region-data";
import { twMerge } from "tailwind-merge";

import {
  findSupportedCountry,
  type SupportedCountry,
} from "@kenstack/fields/supportedCountries";
import ComboboxField from "@kenstack/forms/ComboboxField";
import InputField from "@kenstack/forms/InputField";

type AddressFieldsProps = {
  className?: string;
  countries?: readonly SupportedCountry[];
  title?: ReactNode;
};

const countryPriority = ["US", "CA"];

const defaultLabels = {
  locality: "City / Town",
  region: "Region",
  postalCode: "Postal Code",
};

const countryLabels: Record<string, typeof defaultLabels> = {
  US: {
    locality: "City",
    region: "State",
    postalCode: "ZIP Code",
  },
  CA: {
    locality: "City / Town",
    region: "Province",
    postalCode: "Postal Code",
  },
  GB: {
    locality: "Town / City",
    region: "County / Region",
    postalCode: "Postcode",
  },
  AU: {
    locality: "Suburb / Locality",
    region: "State / Territory",
    postalCode: "Postcode",
  },
};

function orderCountries(countries: CountryData[]) {
  const options: SupportedCountry[] = countries.map(([name, code, regions]) => {
    const labels = countryLabels[code] ?? defaultLabels;

    return {
      code,
      name,
      localityLabel: labels.locality,
      postalCodeLabel: labels.postalCode,
      regionLabel: labels.region,
      regions: regions.map(([regionName, regionCode]) => ({
        code: regionCode,
        name: regionName,
      })),
    } satisfies SupportedCountry;
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
}: AddressFieldsProps) {
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
  const labels = selectedCountry
    ? {
        locality: selectedCountry.localityLabel,
        region: selectedCountry.regionLabel,
        postalCode: selectedCountry.postalCodeLabel,
      }
    : defaultLabels;

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
      <ComboboxField
        name="countryCode"
        label="Country"
        disabled={!countryOptions.length}
        emptyMessage="No countries found."
        placeholder="Select country"
        onChange={(nextCountryCode) => {
          const currentRegion =
            typeof regionCode === "string" ? regionCode : "";
          const nextCountry = findSupportedCountry(
            countryOptions,
            nextCountryCode,
          );
          const matchedRegion = findRegion(nextCountry, currentRegion);
          const nextRegion =
            regionDrafts.current[nextCountryCode] ??
            matchedRegion?.code ??
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
      <InputField name="addressLine1" label="Address" />
      <InputField
        name="addressLine2"
        label="Address 2"
        placeholder="Apartment, suite, unit, floor"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <InputField name="locality" label={labels.locality} />
        {selectedCountry?.regions.length ? (
          <ComboboxField
            name="regionCode"
            label={labels.region}
            emptyMessage={`No ${labels.region.toLowerCase()} found.`}
            placeholder={`Select ${labels.region.toLowerCase()}`}
            options={selectedCountry.regions.map((region) => ({
              value: region.code,
              label: region.name,
            }))}
          />
        ) : (
          <InputField name="regionCode" label={labels.region} />
        )}
        <InputField
          name="postalCode"
          label={labels.postalCode}
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

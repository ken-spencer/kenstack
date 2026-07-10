export type SupportedCountryRegion = {
  code: string;
  name: string;
};

export type SupportedCountry = {
  code: string;
  name: string;
  localityLabel: string;
  postalCodeLabel: string;
  regionLabel: string;
  regions: readonly SupportedCountryRegion[];
};

export const supportedCountries = [
  {
    code: "CA",
    name: "Canada",
    localityLabel: "City / Town",
    postalCodeLabel: "Postal Code",
    regionLabel: "Province",
    regions: [
      { code: "AB", name: "Alberta" },
      { code: "BC", name: "British Columbia" },
      { code: "MB", name: "Manitoba" },
      { code: "NB", name: "New Brunswick" },
      { code: "NL", name: "Newfoundland and Labrador" },
      { code: "NS", name: "Nova Scotia" },
      { code: "NT", name: "Northwest Territories" },
      { code: "NU", name: "Nunavut" },
      { code: "ON", name: "Ontario" },
      { code: "PE", name: "Prince Edward Island" },
      { code: "QC", name: "Quebec" },
      { code: "SK", name: "Saskatchewan" },
      { code: "YT", name: "Yukon" },
    ],
  },
  {
    code: "US",
    name: "United States",
    localityLabel: "City",
    postalCodeLabel: "ZIP Code",
    regionLabel: "State",
    regions: [
      { code: "AL", name: "Alabama" },
      { code: "AK", name: "Alaska" },
      { code: "AZ", name: "Arizona" },
      { code: "AR", name: "Arkansas" },
      { code: "CA", name: "California" },
      { code: "CO", name: "Colorado" },
      { code: "CT", name: "Connecticut" },
      { code: "DE", name: "Delaware" },
      { code: "DC", name: "District of Columbia" },
      { code: "FL", name: "Florida" },
      { code: "GA", name: "Georgia" },
      { code: "HI", name: "Hawaii" },
      { code: "ID", name: "Idaho" },
      { code: "IL", name: "Illinois" },
      { code: "IN", name: "Indiana" },
      { code: "IA", name: "Iowa" },
      { code: "KS", name: "Kansas" },
      { code: "KY", name: "Kentucky" },
      { code: "LA", name: "Louisiana" },
      { code: "ME", name: "Maine" },
      { code: "MD", name: "Maryland" },
      { code: "MA", name: "Massachusetts" },
      { code: "MI", name: "Michigan" },
      { code: "MN", name: "Minnesota" },
      { code: "MS", name: "Mississippi" },
      { code: "MO", name: "Missouri" },
      { code: "MT", name: "Montana" },
      { code: "NE", name: "Nebraska" },
      { code: "NV", name: "Nevada" },
      { code: "NH", name: "New Hampshire" },
      { code: "NJ", name: "New Jersey" },
      { code: "NM", name: "New Mexico" },
      { code: "NY", name: "New York" },
      { code: "NC", name: "North Carolina" },
      { code: "ND", name: "North Dakota" },
      { code: "OH", name: "Ohio" },
      { code: "OK", name: "Oklahoma" },
      { code: "OR", name: "Oregon" },
      { code: "PA", name: "Pennsylvania" },
      { code: "RI", name: "Rhode Island" },
      { code: "SC", name: "South Carolina" },
      { code: "SD", name: "South Dakota" },
      { code: "TN", name: "Tennessee" },
      { code: "TX", name: "Texas" },
      { code: "UT", name: "Utah" },
      { code: "VT", name: "Vermont" },
      { code: "VA", name: "Virginia" },
      { code: "WA", name: "Washington" },
      { code: "WV", name: "West Virginia" },
      { code: "WI", name: "Wisconsin" },
      { code: "WY", name: "Wyoming" },
    ],
  },
] as const satisfies readonly SupportedCountry[];

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function findSupportedCountry(
  countries: readonly SupportedCountry[],
  countryCode: unknown,
) {
  const code = normalizeCode(countryCode);

  return countries.find((country) => country.code === code);
}

export function findSupportedRegion(
  country: SupportedCountry | undefined,
  regionCode: unknown,
) {
  const code = normalizeCode(regionCode);

  return country?.regions.find((region) => region.code === code);
}

export function formatSupportedRegion(
  countryCode: unknown,
  regionCode: unknown,
  countries: readonly SupportedCountry[] = supportedCountries,
) {
  const countryValue = normalizeCode(countryCode);
  const regionValue = normalizeCode(regionCode);
  const country = findSupportedCountry(countries, countryValue);
  const region = findSupportedRegion(country, regionValue);

  return [region?.name ?? regionValue, country?.name ?? countryValue]
    .filter(Boolean)
    .join(", ");
}

export function formatSupportedRegionCode(
  countryCode: unknown,
  regionCode: unknown,
) {
  const countryValue = normalizeCode(countryCode);
  const regionValue = normalizeCode(regionCode);

  return [countryValue, regionValue].filter(Boolean).join("-");
}

export function isSupportedCountryCode(
  countryCode: string,
  countries: readonly SupportedCountry[] = supportedCountries,
) {
  return Boolean(findSupportedCountry(countries, countryCode));
}

export function isSupportedRegionCode(
  countryCode: string,
  regionCode: string,
  countries: readonly SupportedCountry[] = supportedCountries,
) {
  return Boolean(
    findSupportedRegion(
      findSupportedCountry(countries, countryCode),
      regionCode,
    ),
  );
}

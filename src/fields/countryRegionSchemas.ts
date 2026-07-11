import * as z from "zod";

import {
  isSupportedCountryCode,
  isSupportedRegionCode,
  type SupportedCountry,
} from "./supportedCountries";

const countryCodePattern = /^[A-Z]{2}$/;
const regionCodePattern = /^[A-Z0-9-]{1,64}$/;

export function countryCodeSchema({
  countries,
  required = true,
}: {
  countries?: readonly SupportedCountry[];
  required?: boolean;
} = {}) {
  return z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => !required || value.length > 0, "Country is required")
    .refine(
      (value) => !value || countryCodePattern.test(value),
      "Select a country",
    )
    .refine(
      (value) =>
        !value ||
        !countries ||
        !countryCodePattern.test(value) ||
        isSupportedCountryCode(value, countries),
      "Select a supported country",
    );
}

export function regionCodeSchema({
  required = true,
}: { required?: boolean } = {}) {
  return z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => !required || value.length > 0, "Region is required")
    .refine(
      (value) => !value || regionCodePattern.test(value),
      "Select a region",
    );
}

export function validateSupportedCountryRegion(
  values: Record<string, unknown>,
  ctx: z.RefinementCtx,
) {
  const countryCode =
    typeof values.countryCode === "string" ? values.countryCode : "";
  const regionCode =
    typeof values.regionCode === "string" ? values.regionCode : "";

  if (!countryCode || !regionCode || !isSupportedCountryCode(countryCode)) {
    return;
  }

  if (!isSupportedRegionCode(countryCode, regionCode)) {
    ctx.addIssue({
      code: "custom",
      path: ["regionCode"],
      message: "Select a supported region",
    });
  }
}

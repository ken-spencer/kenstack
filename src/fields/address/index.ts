import * as z from "zod";

import { attachFieldSetRefinements } from "../internal/fieldSetRefinements";
import { field, type FieldOption } from "../field";
import {
  isSupportedCountryCode,
  isSupportedRegionCode,
  type SupportedCountry,
} from "./countries";

type AddressFieldOverride = Partial<
  Omit<FieldOption<"text", string>, "__kenstackField" | "kind" | "list">
> & {
  list?: boolean;
};

type AddressFieldOptions = {
  countryCode?: AddressFieldOverride;
  addressLine1?: AddressFieldOverride;
  addressLine2?: AddressFieldOverride;
  locality?: AddressFieldOverride;
  regionCode?: AddressFieldOverride;
  postalCode?: AddressFieldOverride;
  required?: boolean;
};

const countryCodePattern = /^[A-Z]{2}$/;

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
      (value) => !value || /^[A-Z0-9-]{1,64}$/.test(value),
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

const postalCodeFormats: Record<string, { message: string; pattern: RegExp }> =
  {
    AU: {
      pattern: /^\d{4}$/i,
      message: "Enter a valid Australian postcode",
    },
    CA: {
      pattern:
        /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
      message: "Enter a valid Canadian postal code",
    },
    US: {
      pattern: /^\d{5}(-\d{4})?$/i,
      message: "Enter a valid ZIP code",
    },
  };

const fallbackPostalCodeFormat = {
  pattern: /^[A-Z0-9]$|^[A-Z0-9][A-Z0-9\s-]{0,30}[A-Z0-9]$/i,
  message: "Enter a valid postal code",
};

const addressTextDefinition = {
  default: "",
  filterKind: "text",
  kind: "text",
} as const;

function addressTextSchema(label: string, required: boolean) {
  const schema = z.string().trim();
  return required ? schema.min(1, `${label} is required`) : schema;
}

function validatePostalCode(
  values: Record<string, unknown>,
  ctx: z.RefinementCtx,
) {
  const postalCode = values.postalCode;

  if (typeof postalCode !== "string" || !postalCode) {
    return;
  }

  const countryCode =
    typeof values.countryCode === "string" ? values.countryCode : "";
  const format = postalCodeFormats[countryCode] ?? fallbackPostalCodeFormat;

  if (!format.pattern.test(postalCode)) {
    ctx.addIssue({
      code: "custom",
      path: ["postalCode"],
      message: format.message,
    });
  }
}

export function defineAddressFields({
  countryCode,
  addressLine1,
  addressLine2,
  locality,
  regionCode,
  postalCode,
  required = false,
}: AddressFieldOptions = {}) {
  const { default: countryDefault = "", ...countryCodeOptions } =
    countryCode ?? {};

  return attachFieldSetRefinements(
    {
      countryCode: field({
        ...addressTextDefinition,
        default: countryDefault.toUpperCase(),
        zod: countryCodeSchema({ required }),
        ...countryCodeOptions,
      }),
      addressLine1: field({
        ...addressTextDefinition,
        label: "Address",
        zod: addressTextSchema("Address", required),
        ...addressLine1,
      }),
      addressLine2: field({
        ...addressTextDefinition,
        label: "Address 2",
        zod: addressTextSchema("Address 2", false),
        ...addressLine2,
      }),
      locality: field({
        ...addressTextDefinition,
        label: "City / Town",
        zod: addressTextSchema("City / town", required),
        ...locality,
      }),
      regionCode: field({
        ...addressTextDefinition,
        label: "Region",
        zod: regionCodeSchema({ required }),
        ...regionCode,
      }),
      postalCode: field({
        ...addressTextDefinition,
        label: "Postal Code",
        zod: addressTextSchema("Postal code", required).transform((value) =>
          value.toUpperCase().replace(/\s+/g, " ").trim(),
        ),
        ...postalCode,
      }),
    },
    { superRefine: validatePostalCode },
  );
}

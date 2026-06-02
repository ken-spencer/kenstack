import * as z from "zod";

import { textField } from "./client";

type AddressFieldOptions = {
  defaultCountryCode?: string;
  required?: boolean;
};

const postalCodeFormats: Record<string, { message: string; pattern: RegExp }> = {
  AU: {
    pattern: /^\d{4}$/i,
    message: "Enter a valid Australian postcode",
  },
  CA: {
    pattern: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
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

function normalizePostalCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, " ").trim();
}

function addressTextSchema(label: string, required: boolean) {
  const schema = z.string().trim();
  return required ? schema.min(1, `${label} is required`) : schema;
}

function postalCodeSchema(required: boolean) {
  return addressTextSchema("Postal code", required).transform(
    normalizePostalCode,
  );
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

export function createAddressFieldOptions({
  defaultCountryCode = "US",
  required = false,
}: AddressFieldOptions = {}) {
  return {
    countryCode: textField({
      default: defaultCountryCode.toUpperCase(),
      zod: z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .refine((value) => !required || value.length > 0, "Country is required")
        .refine((value) => !value || value.length === 2, "Select a country"),
    }),
    addressLine1: textField({
      label: "Address",
      zod: addressTextSchema("Address", required),
    }),
    addressLine2: textField({
      label: "Address 2",
      zod: addressTextSchema("Address 2", false),
    }),
    locality: textField({
      label: "City / Town",
      zod: addressTextSchema("City / town", required),
    }),
    regionCode: textField({
      label: "Region",
      zod: addressTextSchema("Region", required),
    }),
    postalCode: textField({
      label: "Postal Code",
      zod: postalCodeSchema(required),
      recordRefinement: validatePostalCode,
    }),
  };
}

export const addressFieldOptions = createAddressFieldOptions();
export const requiredAddressFieldOptions = createAddressFieldOptions({
  required: true,
});

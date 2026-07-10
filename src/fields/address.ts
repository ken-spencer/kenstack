import * as z from "zod";

import { attachFieldSetRefinements } from "./fieldSetRefinements";
import { textField } from "./client";
import type { FieldOption } from "./types";

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
      countryCode: textField({
        default: countryDefault.toUpperCase(),
        zod: z
          .string()
          .trim()
          .transform((value) => value.toUpperCase())
          .refine(
            (value) => !required || value.length > 0,
            "Country is required",
          )
          .refine((value) => !value || value.length === 2, "Select a country"),
        ...countryCodeOptions,
      }),
      addressLine1: textField({
        label: "Address",
        zod: addressTextSchema("Address", required),
        ...addressLine1,
      }),
      addressLine2: textField({
        label: "Address 2",
        zod: addressTextSchema("Address 2", false),
        ...addressLine2,
      }),
      locality: textField({
        label: "City / Town",
        zod: addressTextSchema("City / town", required),
        ...locality,
      }),
      regionCode: textField({
        label: "Region",
        zod: addressTextSchema("Region", required),
        ...regionCode,
      }),
      postalCode: textField({
        label: "Postal Code",
        zod: addressTextSchema("Postal code", required).transform((value) =>
          value.toUpperCase().replace(/\s+/g, " ").trim(),
        ),
        ...postalCode,
      }),
    },
    validatePostalCode,
  );
}

import { defineFields } from "@kenstack/admin/fields";
import { textField } from "@kenstack/fields";
import {
  countryCodeSchema,
  regionCodeSchema,
  validateSupportedCountryRegion,
} from "@kenstack/fields/address";
import { supportedCountries } from "@kenstack/fields/address/countries";
import { ratesField } from "./rates";

// Host module and client registration share the same category configuration.
export function fields(taxCategories: Parameters<typeof ratesField>[0]) {
  return defineFields({
    superRefine: validateSupportedCountryRegion,
    fields: {
      countryCode: textField({
        label: "Country",
        default: "CA",
        searchable: true,
        list: true,
        filter: true,
        sort: true,
        zod: countryCodeSchema({ countries: supportedCountries }),
      }),
      regionCode: textField({
        label: "Region",
        searchable: true,
        list: true,
        filter: true,
        sort: true,
        zod: regionCodeSchema(),
      }),
      rates: ratesField(taxCategories),
    },
  });
}

import {
  dateTimeField,
  imageField,
  radioButtonField,
  textField,
  textareaField,
} from "@kenstack/fields";
import { visibilityStatusOptions } from "./lib/visibilityStatus";
import * as z from "zod";

export { visibilityOptions, visibilityValues } from "./lib/visibility";

export const metaFieldOptions = {
  visibility: radioButtonField({
    default: "draft",
    filter: true,
    label: "Status",
    options: visibilityStatusOptions,
  }),
  publishedAt: dateTimeField({
    filter: true,
    label: "Publish On",
    sort: { defaultDirection: "desc" },
  }),
  ogImage: imageField({ label: "Open Graph Image (1200 x 630)" }),
  seoTitle: textField({
    label: "SEO Title (If different than Title)",
    searchable: true,
    zod: z
      .string()
      .trim()
      .max(100, "Max of 100 characters. 50 to 60 will be shown"),
  }),
  seoDescription: textareaField({
    label: "SEO Description (if different than Description)",
    searchable: true,
    zod: z.string().trim().max(300, "max of 300 characters"),
  }),
} as const;

import {
  dateTimeField,
  imageField,
  radioButtonField,
  textField,
  textareaField,
} from "@kenstack/fields/client";
import { visibilityStatusOptions } from "./lib/visibilityStatus";
import * as z from "zod";

export { visibilityOptions, visibilityValues } from "./lib/visibility";

export const metaFieldOptions = {
  visibility: radioButtonField({
    default: "draft",
    options: visibilityStatusOptions,
  }),
  publishedAt: dateTimeField({
    filter: true,
    sort: { defaultDirection: "desc" },
  }),
  ogImage: imageField(),
  seoTitle: textField({
    searchable: true,
    zod: z
      .string()
      .trim()
      .max(100, "Max of 100 characters. 50 to 60 will be shown"),
  }),
  seoDescription: textareaField({
    searchable: true,
    zod: z.string().trim().max(300, "max of 300 characters"),
  }),
} as const;

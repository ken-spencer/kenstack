import {
  dateTimeField,
  imageField,
  radioButtonField,
  textField,
} from "@kenstack/fields/client";
import { visibilityStatusOptions } from "./lib/visibilityStatus";

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
  }),
  seoDescription: textField({
    searchable: true,
  }),
} as const;

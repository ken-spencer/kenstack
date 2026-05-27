import * as z from "zod";

import { dateTimeField, imageField, textField } from "@kenstack/fields/client";
import { visibilityValues } from "./lib/visibility";

export { visibilityOptions, visibilityValues } from "./lib/visibility";

export const metaFieldOptions = {
  visibility: textField({
    default: "draft",
    zod: z.enum(visibilityValues),
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

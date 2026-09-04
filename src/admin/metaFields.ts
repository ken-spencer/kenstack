import {
  dateTimeField,
  imageField,
  radioButtonField,
  textField,
  textareaField,
} from "@kenstack/fields";
import { visibilityStatusOptions } from "./lib/visibilityStatus";
import * as z from "zod";

import type { FieldOptions } from "../fields/field";
import { defineFields, type DefinedFields } from "./fields";

export { visibilityOptions, visibilityValues } from "./lib/visibility";

export const metaFieldOptions = {
  visibility: radioButtonField({
    default: "published",
    filter: true,
    label: "Status",
    options: visibilityStatusOptions,
  }),
  publishedAt: dateTimeField({
    filter: true,
    label: "Publish On",
    sort: { defaultDirection: "desc" },
  }),
  ogImage: imageField({ label: "Image" }),
  seoTitle: textField({
    label: "Title",
    searchable: true,
    zod: z
      .string()
      .trim()
      .max(100, "Max of 100 characters. 50 to 60 will be shown"),
  }),
  seoDescription: textareaField({
    label: "Description",
    searchable: true,
    zod: z.string().trim().max(300, "max of 300 characters"),
  }),
} as const;

// The table flags own publication and SEO: defineTable({ publish, seo })
// provisions the columns and the module's generated fields follow them. A
// module with a different concept, such as sales availability, declares its
// own field under its own name.
export function pickMetaFields({
  publish,
  seo,
}: {
  publish: boolean;
  seo: boolean;
}): DefinedFields {
  const fields: FieldOptions = {
    ...(publish
      ? {
          visibility: metaFieldOptions.visibility,
          publishedAt: metaFieldOptions.publishedAt,
        }
      : {}),
    ...(seo
      ? {
          seoTitle: metaFieldOptions.seoTitle,
          seoDescription: metaFieldOptions.seoDescription,
          ogImage: metaFieldOptions.ogImage,
        }
      : {}),
  };

  return defineFields({ fields });
}

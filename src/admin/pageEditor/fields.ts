import { defineFields } from "@kenstack/admin/fields";
import { metaFieldOptions } from "@kenstack/admin/metaFields";
import { getFieldNames } from "@kenstack/fields/getFieldNames";
import {
  imageField,
  markdownField,
  textField,
  textareaField,
} from "@kenstack/fields";
import * as z from "zod";

export const pageEditorInlineFields = {
  title: textField({ zod: z.string().trim() }),
  description: textareaField({ zod: z.string() }),
  content: markdownField({ zod: z.string() }),
};

export type PageEditorFieldName = keyof typeof pageEditorInlineFields;

export const pageEditorFields = defineFields({
  fields: {
    ...pageEditorInlineFields,
    image: imageField({ selectVariant: "original" }),
    seoTitle: metaFieldOptions.seoTitle,
    seoDescription: metaFieldOptions.seoDescription,
    ogImage: metaFieldOptions.ogImage,
  },
});

export const pageEditorFieldNames = getFieldNames(pageEditorFields);

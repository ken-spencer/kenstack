import { defineFields } from "@kenstack/admin/fields";
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
  seo: true,
  fields: {
    ...pageEditorInlineFields,
    image: imageField({ selectVariant: "original" }),
  },
});

export const pageEditorFieldNames = getFieldNames(pageEditorFields);

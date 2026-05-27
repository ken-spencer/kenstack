import { defineFields } from "@kenstack/fields/defineFields";
import { getFieldNames } from "@kenstack/fields/getFieldNames";
import {
  imageField,
  markdownField,
  textField,
  textareaField,
} from "@kenstack/fields/client";
import * as z from "zod";

export const pageEditorFields = defineFields({
  title: textField({ zod: z.string().trim() }),
  description: textareaField({ zod: z.string() }),
  content: markdownField({ zod: z.string() }),
  image: imageField(),
  seoTitle: textField({
    zod: z
      .string()
      .trim()
      .max(100, "Max of 100 characters. 50 to 60 will be shown"),
  }),
  seoDescription: textareaField({
    zod: z.string().trim().max(300, "max of 300 characters"),
  }),
  ogImage: imageField(),
});

export const pageEditorFieldNames = getFieldNames(pageEditorFields);

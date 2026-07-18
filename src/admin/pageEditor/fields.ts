import { defineFields } from "@kenstack/admin/fields";
import { getFieldNames } from "@kenstack/fields/getFieldNames";
import {
  imageField,
  markdownField,
  textField,
  textareaField,
} from "@kenstack/fields/client";
import * as z from "zod";

export const pageEditorFields = defineFields({
  seo: true,
  fields: {
    title: textField({ zod: z.string().trim() }),
    description: textareaField({ zod: z.string() }),
    content: markdownField({ zod: z.string() }),
    image: imageField(),
  },
});

export const pageEditorFieldNames = getFieldNames(pageEditorFields);

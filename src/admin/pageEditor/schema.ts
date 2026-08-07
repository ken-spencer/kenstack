import { pageEditorFields } from "./fields";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import type * as z from "zod";

export const pageEditorSchema =
  createSchemaFromFields(pageEditorFields).strict();
export const pageEditorSettingsSchema = pageEditorSchema.pick({
  seoTitle: true,
  seoDescription: true,
  ogImage: true,
});

export type PageContent = z.infer<typeof pageEditorSchema>;
export type ApiSchema = {
  slug: string;
  changes: string[];
  values: Partial<PageContent>;
};

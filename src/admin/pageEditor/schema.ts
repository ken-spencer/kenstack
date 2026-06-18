import { pageEditorFields } from "./fields";
import { createZodSchema } from "@kenstack/fields/createZodSchema";
import type * as z from "zod";

export const pageEditorSchema = createZodSchema(pageEditorFields).strict();
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

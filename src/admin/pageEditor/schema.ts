import { pageEditorFields } from "./fields";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";

export const pageEditorSchema =
  createSchemaFromFields(pageEditorFields).strict();
export const pageEditorSettingsSchema = pageEditorSchema.pick({
  seoTitle: true,
  seoDescription: true,
  ogImage: true,
});

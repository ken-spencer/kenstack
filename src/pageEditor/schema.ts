import * as z from "zod";

const schema = {
  title: z.string().trim(),
  description: z.string(),
  content: z.string(),
  seoTitle: z
    .string()
    .trim()
    .max(100, "Max of 100 characters. 50 to 60 will be shown"),
  seoDescription: z.string().trim().max(300, "max of 300 characters"),
};

export const pageEditorSchema = z.object(schema).strict();

export const editableFields = [
  "title",
  "description",
  "content",
  "seoTitle",
  "seoDescription",
] as const;

const base = z.object({
  slug: z.string().trim().toLowerCase(),
});

export const apiSchema = z.discriminatedUnion(
  "field",
  [
    base.extend({ field: z.literal("title"), value: schema.title }),
    base.extend({ field: z.literal("description"), value: schema.description }),
    base.extend({ field: z.literal("content"), value: schema.content }),
    base.extend({ field: z.literal("seoTitle"), value: schema.seoTitle }),
    base.extend({
      field: z.literal("seoDescription"),
      value: schema.seoDescription,
    }),
  ],
  "There was an unexpected problem. An invalid field name was specified."
);

export type EditableField = (typeof editableFields)[number];

export function isEditableField(value: string): value is EditableField {
  return (editableFields as readonly string[]).includes(value);
}

export type ApiSchema = z.infer<typeof apiSchema>;
export type PageContent = z.infer<typeof pageEditorSchema>;

import * as z from "zod";

import { configurable, defineField, type MediaUploadOptions } from "../field";

export const fileValueSchema = z.object({
  id: z.number().optional(),
  url: z.string(),
  kind: z.literal("file").nullish(),
  filename: z.string().nullish(),
  sourceType: z.string().nullish(),
  sourceSize: z.number().nullable().optional(),
  originalUrl: z.string().nullish(),
});

const upload = fileValueSchema.extend({
  action: z.literal("upload"),
  mediaId: z.string(),
});

const remove = z.object({
  action: z.literal("remove"),
});

export const fileSchema = z
  .union([
    z.discriminatedUnion("action", [upload, remove]),
    fileValueSchema,
    z.number(),
  ])
  .nullable();

export const fileField = defineField({
  ...configurable<MediaUploadOptions>("accept"),
  default: null,
  zod: fileSchema,
  kind: "file",
});

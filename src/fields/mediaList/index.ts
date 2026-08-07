import * as z from "zod";

import { configurable, defineField, type MediaUploadOptions } from "../field";
import { fileValueSchema } from "../file";
import { imageValueSchema } from "../image";

const imageUpload = imageValueSchema.extend({
  action: z.literal("upload"),
  mediaId: z.string(),
});

const fileValue = fileValueSchema.extend({ kind: z.literal("file") });
const fileUpload = fileValue.extend({
  action: z.literal("upload"),
  mediaId: z.string(),
});

export const mediaListSchema = z.array(
  z.union([imageUpload, fileUpload, imageValueSchema, fileValue]),
);

export const mediaListField = defineField({
  ...configurable<MediaUploadOptions>("accept"),
  default: [],
  zod: mediaListSchema,
  kind: "media-list",
});

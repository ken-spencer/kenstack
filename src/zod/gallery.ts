import * as z from "zod";

const galleryImageFields = z.object({
  id: z.number().optional(),
  url: z.string(),
  kind: z.string().nullish(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  alt: z.string().nullish(),
  title: z.string().nullish(),
  caption: z.string().nullish(),
  filename: z.string().nullish(),
  sourceType: z.string().nullish(),
  sourceSize: z.number().nullable().optional(),
  sourceWidth: z.number().nullable().optional(),
  sourceHeight: z.number().nullable().optional(),
  originalUrl: z.string().nullish(),
});

const upload = galleryImageFields.extend({
  action: z.literal("upload"),
  imageId: z.string(),
});

export const galleryImageSchema = z.union([upload, galleryImageFields]);

export const gallerySchema = z.array(galleryImageSchema);

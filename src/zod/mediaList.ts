import * as z from "zod";
import { squareCropSchema } from "./image";

const mediaImageFields = z.object({
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
  squareCrop: squareCropSchema,
});

const upload = mediaImageFields.extend({
  action: z.literal("upload"),
  mediaId: z.string(),
});

const mediaListImageSchema = z.union([upload, mediaImageFields]);

export const mediaListSchema = z.array(mediaListImageSchema);

import * as z from "zod";

export const squareCropSchema = z
  .object({
    mode: z.enum(["center", "manual"]),
    x: z.number(),
    y: z.number(),
    zoom: z.number().optional(),
  })
  .nullable()
  .optional();

const imageFields = z.object({
  id: z.number().optional(),
  url: z.string(),
  kind: z.string().nullish(),
  width: z.number().nullable(),
  height: z.number().nullable(),
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

const upload = imageFields.extend({
  action: z.literal("upload"),
  imageId: z.string(),
});

const remove = z.object({
  action: z.literal("remove"),
});

export const imageSchema = z
  .union([
    z.discriminatedUnion("action", [upload, remove]),
    imageFields,
    z.number(),
  ])
  .nullable();

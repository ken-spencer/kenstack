import * as z from "zod";

const imageFields = z.object({
  url: z.string(),
  kind: z.string().nullish(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  alt: z.string().nullish(),
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

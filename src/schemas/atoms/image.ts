import * as z from "zod";

const SizeSchema = z.object({
  format: z.string().optional(),
  square: z.boolean().default(false),
  bytes: z.number().optional(),
  url: z.string(), // required
  width: z.number(), // required
  height: z.number(), // required
  transformation: z.string().optional(),
});

const ImageSchema = () =>
  z
    .object({
      filename: z.string(),
      asset_id: z.string().optional(),
      public_id: z.string().optional(),
      version: z.number().optional(),
      version_id: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      format: z.string().optional(),
      bytes: z.number().optional(),
      url: z.string(),
      asset_folder: z.string().optional(),
      display_name: z.string().optional(),
      original_filename: z.string().optional(),
      alt: z.string().default(""),
      // represent your Map<string,Size> as a record so JSON works
      sizes: z.record(z.string(), SizeSchema).optional(),
      square: z
        .object({
          zoom: z.number().min(0).max(100).optional(),
          cropX: z.number().optional(),
          cropY: z.number().optional(),
        })
        .nullable()
        .default(null),
    })
    .nullish()
    .describe("image-field");

export default ImageSchema;

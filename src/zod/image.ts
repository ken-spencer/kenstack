import * as z from "zod";

export const rasterMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

export const imageMimeTypes = [...rasterMimeTypes, "image/svg+xml"] as const;

const rasterMimeSchema = z.enum(rasterMimeTypes);

const generatedMimeSchema = z.enum([
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/avif",
]);

const svgMimeSchema = z.literal("image/svg+xml");

const storedFileSchema = z.object({
  key: z.string().min(1),
  type: z.string().min(1),
  url: z.string(),
  size: z.number().int().nonnegative().optional(),
});

const rasterFileSchema = storedFileSchema.extend({
  type: rasterMimeSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const imageBaseSchema = z.object({
  filename: z.string().min(1),
  prefix: z.string().min(1),
  baseName: z.string().min(1),
  alt: z.string().optional(),
});

const cropSchema = z.object({
  mode: z.enum(["center", "manual"]),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const variantSchema = z.object({
  key: z.string().min(1),
  url: z.string(),
  type: generatedMimeSchema.default("image/webp"),
  size: z.number().int().nonnegative().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const squareVariantSchema = variantSchema.extend({
  square: z.literal(true),
  crop: cropSchema.optional(),
});

const rasterImageSchema = imageBaseSchema.extend({
  kind: z.literal("raster"),
  version: z.number().int().positive(),

  source: rasterFileSchema,

  variants: z.object({
    original: variantSchema,
    square: squareVariantSchema,
  }),
});

const svgImageSchema = imageBaseSchema.extend({
  kind: z.literal("svg"),
  version: z.number().int().positive(),

  source: storedFileSchema.extend({
    type: svgMimeSchema,
  }),
});

export const imageDataSchema = z.discriminatedUnion("kind", [
  rasterImageSchema,
  svgImageSchema,
]);

export type ImageData = z.infer<typeof imageDataSchema>;

/**

export type RasterMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif"
  | "image/heic"
  | "image/heif";

export type ImageMimeType = RasterMimeType | "image/svg+xml";

export type GeneratedMimeType =
  | "image/webp"
  | "image/png"
  | "image/jpeg"
  | "image/avif";

export type StoredFile = {
  key: string;
  type: string;
  url: string;
  size?: number;
};

export type RasterFile = StoredFile & {
  type: RasterMimeType;
  width: number;
  height: number;
};

export type ImageBase = {
  filename: string;
  prefix: string;
  baseName: string;
  alt?: string;
};

export type Crop = {
  mode: "center" | "manual";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Variant = {
  key: string;
  url: string;
  type: GeneratedMimeType;
  size?: number;
  width: number;
  height: number;
};

export type SquareVariant = Variant & {
  square: true;
  crop?: Crop;
};

export type RasterImageData = ImageBase & {
  kind: "raster";
  version: number;
  source: RasterFile;
  variants: {
    original: Variant;
    square: SquareVariant;
  };
};

export type SvgImageData = ImageBase & {
  kind: "svg";
  version: number;
  source: StoredFile & {
    type: "image/svg+xml";
  };
};

export type ImageData = RasterImageData | SvgImageData;


 */

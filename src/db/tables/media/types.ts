import {
  documentMimeTypes,
  imageMimeTypes,
  rasterMimeTypes,
} from "./mimeTypes";

export type RasterMimeType = (typeof rasterMimeTypes)[number];
export type ImageMimeType = (typeof imageMimeTypes)[number];
export type DocumentMimeType = (typeof documentMimeTypes)[number];

export type GeneratedMimeType =
  "image/webp" | "image/png" | "image/jpeg" | "image/avif";

export type Variant = {
  key: string;
  type: GeneratedMimeType;
  url: string;
  size?: number;
  width: number;
  height: number;
};

export type CropSource = Pick<Variant, "url" | "width" | "height">;

export type SquareCrop = {
  /** Normalized crop center in the EXIF-oriented processed original. */
  x: number;
  y: number;
  /** source short edge / crop-box size; 1 is centered cover fit. */
  zoom: number;
};

export type ImageVariants = {
  squareCrop?: SquareCrop | null;
  original: Variant;
  square: Variant & { square: true };
};

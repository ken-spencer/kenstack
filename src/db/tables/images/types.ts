import { imageMimeTypes, rasterMimeTypes } from "./mimeTypes";

export type RasterMimeType = (typeof rasterMimeTypes)[number];
export type ImageMimeType = (typeof imageMimeTypes)[number];

export type GeneratedMimeType =
  | "image/webp"
  | "image/png"
  | "image/jpeg"
  | "image/avif";

export type Variant = {
  key: string;
  type: GeneratedMimeType;
  url: string;
  size?: number;
  width: number;
  height: number;
};

type SquareVariant = Variant & {
  square: true;
  crop?: {
    mode: "center" | "manual";
    x: number;
    y: number;
  };
};

export type ImageVariants = {
  original: Variant;
  square: SquareVariant;
};

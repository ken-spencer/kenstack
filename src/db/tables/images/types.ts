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

export type SquareCrop = {
  mode: "center" | "manual";
  x: number;
  y: number;
  zoom?: number;
};

type SquareVariant = Variant & {
  square: true;
};

export type ImageVariants = {
  squareCrop?: SquareCrop | null;
  original: Variant;
  square: SquareVariant;
};

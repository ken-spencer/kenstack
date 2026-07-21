import type { ComponentType } from "react";

import type { SelectedMedia } from "@kenstack/db/tables/media";
import type { CropSource, SquareCrop } from "@kenstack/db/tables/media/types";

export type ImageDetailsValue = {
  id?: number;
  url: string;
  kind?: SelectedMedia["kind"] | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  filename?: string | null;
  sourceType?: string | null;
  sourceSize?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  originalUrl?: string | null;
  original?: CropSource | null;
  squareCrop?: SquareCrop | null;
};

export type ImageDetailsEditor = ComponentType<{
  image: ImageDetailsValue;
  onChange: (image: ImageDetailsValue) => void;
  onClose: () => void;
}>;

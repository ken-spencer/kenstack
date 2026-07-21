import type { SquareCrop } from "@kenstack/db/tables/media/types";

export const squareImageSize = 800;

export function getSquareCropMaxZoom(width: number, height: number) {
  const shortEdge = Math.min(width, height);

  return Math.max(1, Math.min(4, shortEdge / squareImageSize));
}

export function normalizeSquareCrop(
  crop: SquareCrop | null | undefined,
  width: number,
  height: number,
): SquareCrop {
  if (!crop || width <= 0 || height <= 0) {
    return { x: 0.5, y: 0.5, zoom: 1 };
  }

  const zoom = clamp(
    Number.isFinite(crop.zoom) ? crop.zoom : 1,
    1,
    getSquareCropMaxZoom(width, height),
  );
  const shortEdge = Math.min(width, height);
  const cropSize = shortEdge / zoom;
  const minX = cropSize / width / 2;
  const minY = cropSize / height / 2;

  return {
    x: clamp(Number.isFinite(crop.x) ? crop.x : 0.5, minX, 1 - minX),
    y: clamp(Number.isFinite(crop.y) ? crop.y : 0.5, minY, 1 - minY),
    zoom,
  };
}

export function getSquareCropExtract(
  crop: SquareCrop | null | undefined,
  width: number,
  height: number,
) {
  const normalized = normalizeSquareCrop(crop, width, height);
  const size = Math.max(
    1,
    Math.round(Math.min(width, height) / normalized.zoom),
  );

  return {
    left: Math.round(clamp(normalized.x * width - size / 2, 0, width - size)),
    top: Math.round(clamp(normalized.y * height - size / 2, 0, height - size)),
    width: size,
    height: size,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

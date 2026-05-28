export const rasterMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

export const imageMimeTypes = [...rasterMimeTypes, "image/svg+xml"] as const;

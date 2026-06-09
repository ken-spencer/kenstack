export const rasterMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

export const imageMimeTypes = [...rasterMimeTypes, "image/svg+xml"] as const;

export const documentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const attachmentMimeTypes = [
  ...rasterMimeTypes,
  ...documentMimeTypes,
] as const;

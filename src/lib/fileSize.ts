type FormatFileSizeOptions = {
  unitStyle?: "short" | "long";
};

const longUnits = ["bytes", "kilobytes", "megabytes", "gigabytes"] as const;
const shortUnits = ["B", "KB", "MB", "GB"] as const;

export function formatFileSize(
  bytes?: number | null,
  { unitStyle = "short" }: FormatFileSizeOptions = {},
) {
  if (!bytes) {
    return null;
  }

  const units = unitStyle === "long" ? longUnits : shortUnits;
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex++;
  }

  const value = Number.isInteger(size) ? size : size.toFixed(1);

  return `${value} ${units[unitIndex]}`;
}

import type { CropSource, SquareCrop } from "@kenstack/db/tables/media/types";
import { cn } from "@kenstack/lib/utils";
import { normalizeSquareCrop } from "./geometry";

export default function SquareCropPreview({
  alt = "",
  className,
  crop,
  source,
}: {
  alt?: string;
  className?: string;
  crop?: SquareCrop | null;
  source: CropSource;
}) {
  const normalized = normalizeSquareCrop(crop, source.width, source.height);
  const shortEdge = Math.min(source.width, source.height);

  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <img
        alt={alt}
        className="pointer-events-none absolute max-w-none select-none"
        draggable={false}
        src={source.url}
        style={{
          height: `${(source.height * normalized.zoom * 100) / shortEdge}%`,
          left: `${50 - (normalized.x * source.width * normalized.zoom * 100) / shortEdge}%`,
          top: `${50 - (normalized.y * source.height * normalized.zoom * 100) / shortEdge}%`,
          width: `${(source.width * normalized.zoom * 100) / shortEdge}%`,
        }}
      />
    </span>
  );
}

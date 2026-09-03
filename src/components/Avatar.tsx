import Image from "next/image";
import { twMerge } from "tailwind-merge";
import { UserRound } from "lucide-react";

const palette = [
  "#F44336", // Red
  "#E91E63", // Pink
  "#9C27B0", // Purple
  "#673AB7", // Deep Purple
  "#3F51B5", // Indigo
  "#2196F3", // Blue
  "#03A9F4", // Light Blue
  "#00BCD4", // Cyan
  "#009688", // Teal
  "#4CAF50", // Green
  "#8BC34A", // Light Green
  "#AFB42B", // Lime
  "#FBC02D", // Golden Yellow
  "#FFC107", // Amber
  "#FF9800", // Orange
  "#FF5722", // Deep Orange
  "#795548", // Brown
  "#607D8B", // Blue Grey
];

export default function Avatar({
  className,
  initials = "",
  url,
}: {
  className?: string;
  initials?: string;
  url?: string | null;
}) {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash += initials.charCodeAt(i);
  }
  const colorIndex = hash % palette.length;

  if (!url && !initials) {
    return (
      <div
        className={twMerge(
          "border-border bg-muted text-muted-foreground inline-flex size-10 items-center justify-center rounded-full border",
          className,
        )}
      >
        <UserRound aria-hidden="true" className="size-[60%]" />
      </div>
    );
  }

  if (url) {
    return (
      <Image
        className={twMerge("size-10 rounded-full", className)}
        src={url}
        width={80}
        height={80}
        alt=""
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: palette[colorIndex] }}
      className={twMerge(
        "inline-flex size-10 items-center justify-center rounded-full text-xl text-white",
        className,
      )}
    >
      <span>{initials}</span>
    </div>
  );
}

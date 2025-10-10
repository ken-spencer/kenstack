import { twMerge } from "tailwind-merge";
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

type AvatarProps = {
  url?: string;
  initials?: string;
  className?: string;
};

export default function Avatar({ url, initials = "", className }: AvatarProps) {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash += initials.charCodeAt(i);
  }
  const index = hash % palette.length;

  if (url) {
    return (
      <img
        className={twMerge("size-10 rounded-full", className)}
        src={url}
        alt=""
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: palette[index] }}
      className={twMerge(
        "inline-flex size-10 items-center justify-center rounded-full p-4 text-xl text-white",
        className
      )}
    >
      <span>{initials}</span>
    </div>
  );
}

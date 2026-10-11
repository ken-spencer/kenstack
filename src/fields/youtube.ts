import * as z from "zod";

import { defineField } from "./field";

/** Isomorphic YouTube URL normalization for admin forms and site UI. */
export function youtubeEmbedUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.replace(/^www\./, "");
    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (
        pathParts[0] === "embed" ||
        pathParts[0] === "shorts" ||
        pathParts[0] === "live" ||
        pathParts[0] === "v"
      ) {
        videoId = pathParts[1] ?? "";
      } else if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") ?? "";
      }
    }

    return videoId
      ? `https://www.youtube.com/embed/${encodeURIComponent(
          videoId,
        )}?autoplay=1&rel=0`
      : "";
  } catch {
    return "";
  }
}

export const youtubeUrlField = defineField({
  kind: "url",
  default: "",
  filterKind: "text",
  zod: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || Boolean(youtubeEmbedUrl(value)),
      "Enter a link to a YouTube video",
    ),
});

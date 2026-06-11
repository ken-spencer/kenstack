"use client";

import { rasterMimeTypes } from "@kenstack/db/tables/media/mimeTypes";
import MediaListField, {
  type MediaListFieldProps,
} from "@kenstack/forms/MediaListField";

export default function ImageListField({
  accept = rasterMimeTypes,
  label = "Images",
  ...props
}: Omit<MediaListFieldProps, "variant">) {
  return (
    <MediaListField {...props} accept={accept} label={label} variant="grid" />
  );
}

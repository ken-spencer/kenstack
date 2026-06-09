"use client";

import { rasterMimeTypes } from "@kenstack/db/tables/media/mimeTypes";
import MediaListField, {
  type MediaListFieldProps,
} from "@kenstack/forms/MediaListField";

export default function ImageListField({
  accept = rasterMimeTypes,
  ...props
}: Omit<MediaListFieldProps, "variant">) {
  return <MediaListField {...props} accept={accept} variant="grid" />;
}

"use client";

import type { ComponentProps } from "react";

import FormsImageListField from "@kenstack/forms/ImageListField";
import { rasterMimeTypes } from "@kenstack/db/tables/media/mimeTypes";
import MediaListField from "@kenstack/admin/forms/MediaListField";

export default function ImageListField(
  props: Omit<ComponentProps<typeof FormsImageListField>, "apiPath" | "data">,
) {
  const { accept = rasterMimeTypes, label = "Images", ...fieldProps } = props;

  return (
    <MediaListField
      {...fieldProps}
      accept={accept}
      label={label}
      variant="grid"
    />
  );
}

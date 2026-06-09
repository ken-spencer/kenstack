"use client";

import MediaListField, {
  type MediaListFieldProps,
} from "@kenstack/forms/MediaListField";
import { attachmentMimeTypes } from "@kenstack/db/tables/media/mimeTypes";

export default function AttachmentListField({
  accept = attachmentMimeTypes,
  ...props
}: Omit<MediaListFieldProps, "variant">) {
  return <MediaListField {...props} accept={accept} variant="attachments" />;
}

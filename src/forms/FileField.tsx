"use client";

import MediaListField, {
  type MediaListFieldProps,
} from "@kenstack/forms/MediaListField";
import { documentMimeTypes } from "@kenstack/db/tables/media/mimeTypes";
import { twMerge } from "tailwind-merge";

export type FileFieldProps = Omit<
  MediaListFieldProps,
  "multiple" | "replacementPlaceholder" | "variant"
>;

export default function FileField({
  accept = documentMimeTypes,
  className,
  placeholder = "Select or drop one file.",
  uploadClassName,
  ...props
}: FileFieldProps) {
  return (
    <MediaListField
      {...props}
      accept={accept}
      className={twMerge(
        "[&>ul]:border-border space-y-0 overflow-hidden p-0 [&>ul]:border-t [&>ul]:px-2 [&>ul]:py-1.5",
        className,
      )}
      multiple={false}
      placeholder={placeholder}
      replacementPlaceholder="Select or drop a new file."
      uploadClassName={twMerge("rounded-none border-0", uploadClassName)}
      variant="attachments"
    />
  );
}

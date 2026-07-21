"use client";

import type { ComponentProps } from "react";

import { useAdminEdit } from "@kenstack/admin/Edit/context";
import ImageDetailsModal from "@kenstack/admin/forms/ImageDetailsModal";
import FormsMediaListField, {
  MediaListFieldWithDetails,
} from "@kenstack/forms/MediaListField";

export default function MediaListField(
  props: Omit<ComponentProps<typeof FormsMediaListField>, "apiPath" | "data">,
) {
  const { apiPath, canUpload, name: adminName } = useAdminEdit();

  return (
    <MediaListFieldWithDetails
      {...props}
      ImageDetails={ImageDetailsModal}
      apiPath={apiPath}
      canUpload={canUpload}
      data={{ name: adminName }}
    />
  );
}

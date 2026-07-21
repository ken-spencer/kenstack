"use client";

import {
  ImageFieldWithDetails,
  type ImageFieldProps,
} from "@kenstack/forms/ImageField";
import { useAdminEdit } from "@kenstack/admin/Edit/context";
import ImageDetailsModal from "@kenstack/admin/forms/ImageDetailsModal";

export default function AdminImageField(
  props: Omit<ImageFieldProps, "apiPath">,
) {
  const { apiPath, canUpload, name } = useAdminEdit();
  const data = {
    name,
  };
  return (
    <ImageFieldWithDetails
      {...props}
      ImageDetails={ImageDetailsModal}
      apiPath={apiPath}
      canUpload={canUpload}
      data={data}
    />
  );
}

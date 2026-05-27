"use client";

import ImageField, { type ImageFieldProps } from "@kenstack/forms/ImageField";
import { useAdminEdit } from "@kenstack/admin/Edit/context";

export default function AdminImageField(
  props: Omit<ImageFieldProps, "apiPath">,
) {
  const { apiPath, canUpload, name } = useAdminEdit();
  const data = {
    name,
  };
  return (
    <ImageField
      {...props}
      apiPath={apiPath}
      canUpload={canUpload}
      data={data}
    />
  );
}

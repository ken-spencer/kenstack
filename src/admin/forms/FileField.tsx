"use client";

import FileField, { type FileFieldProps } from "@kenstack/forms/FileField";
import { useAdminEdit } from "@kenstack/admin/Edit/context";

export default function AdminFileField(
  props: Omit<FileFieldProps, "apiPath" | "data">,
) {
  const { apiPath, canUpload, name } = useAdminEdit();

  return (
    <FileField
      {...props}
      apiPath={apiPath}
      canUpload={canUpload}
      data={{ name }}
    />
  );
}

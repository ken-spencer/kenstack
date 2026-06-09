"use client";

import type { ComponentProps } from "react";

import FormsImageListField from "@kenstack/forms/ImageListField";
import { useAdminEdit } from "@kenstack/admin/Edit/context";

export default function ImageListField(
  props: Omit<ComponentProps<typeof FormsImageListField>, "apiPath" | "data">,
) {
  const { apiPath, name: adminName } = useAdminEdit();

  return (
    <FormsImageListField
      {...props}
      apiPath={apiPath}
      data={{ name: adminName }}
    />
  );
}

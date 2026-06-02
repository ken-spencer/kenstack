"use client";

import type { ComponentProps } from "react";

import { useAdminEdit } from "@kenstack/admin/Edit/context";
import FormsMediaListField from "@kenstack/forms/MediaListField";

export default function MediaListField(
  props: Omit<ComponentProps<typeof FormsMediaListField>, "apiPath" | "data">,
) {
  const { apiPath, name: adminName } = useAdminEdit();

  return (
    <FormsMediaListField
      {...props}
      apiPath={apiPath}
      data={{ name: adminName }}
    />
  );
}

"use client";

import IconButton from "@kenstack/components/IconButton";
import { useForm } from "@kenstack/forms/context";
import { Save } from "lucide-react";
import { useFormContext } from "react-hook-form";

export default function SaveButton() {
  const {
    formState: { isDirty },
  } = useFormContext();
  const { mutation, uploadingFields } = useForm();
  const hasUploads = uploadingFields.size > 0;

  return (
    <IconButton
      disabled={!isDirty || mutation.isPending || hasUploads}
      isPending={mutation.isPending && mutation.variables.submitter === "save"}
      name="action"
      value="save"
      tooltip="Save"
    >
      <Save className="size-6 text-gray-800" />
    </IconButton>
  );
}

"use client";

import Button from "@kenstack/components/Button";
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
    <Button
      disabled={!isDirty || mutation.isPending || hasUploads}
      isPending={mutation.isPending && mutation.variables.submitter === "save"}
      name="action"
      size="icon"
      value="save"
      tooltip="Save"
      variant="ghost"
    >
      <Save className="size-6 text-gray-800" />
    </Button>
  );
}

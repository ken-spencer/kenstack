"use client";

import IconButton from "@kenstack/components/IconButton";
import { useForm } from "@kenstack/forms/context";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { useAdminEdit } from "../context";

export default function NewButton() {
  const searchParams = useSearchParams();
  const {
    formState: { isDirty },
  } = useFormContext();
  const { mutation, uploadingFields } = useForm();
  const { listPath, single } = useAdminEdit();
  const hasUploads = uploadingFields.size > 0;

  if (single) {
    return null;
  }

  if (isDirty) {
    return (
      <IconButton
        disabled={mutation.isPending || hasUploads}
        isPending={mutation.isPending && mutation.variables.submitter === "new"}
        name="action"
        value="new"
        tooltip="New Entry"
      >
        <Plus className="size-6 text-gray-800" />
      </IconButton>
    );
  }

  return (
    <IconButton tooltip="New Entry" asChild>
      <Link
        href={listPath + "/new" + (searchParams.size ? "?" + searchParams : "")}
      >
        <Plus className="size-6 text-gray-800" />
      </Link>
    </IconButton>
  );
}

"use client";

import IconButton from "@kenstack/components/IconButton";
import { useForm } from "@kenstack/forms/context";
import { List } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { useAdminEdit } from "../context";

export default function ListButton() {
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
        isPending={
          mutation.isPending && mutation.variables.submitter === "list"
        }
        name="action"
        value="list"
        tooltip="Go To List"
      >
        <List className="size-6 text-gray-800" />
      </IconButton>
    );
  }

  return (
    <IconButton tooltip="Go To List" asChild>
      <Link href={listPath + (searchParams.size ? "?" + searchParams : "")}>
        <List className="size-6 text-gray-800" />
      </Link>
    </IconButton>
  );
}

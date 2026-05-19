"use client";
import IconButton from "@kenstack/components/IconButton";
import { Plus, Save, List, ScanEye } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useAdminEdit } from "./context";
import { useForm } from "@kenstack/forms/context";
import { useSearchParams } from "next/navigation";

import Link from "next/link";
import DeleteButton, { RestoreButton } from "./DeleteButton";

export default function AdminEditHeader() {
  const searchParams = useSearchParams();
  const {
    formState: { isDirty },
  } = useFormContext();

  const { mutation, uploadingFields } = useForm();
  const { listPath, preview, isNew, single, item } = useAdminEdit();
  const hasUploads = uploadingFields.size > 0;
  const isDeleted = !!item?.deletedAt;
  const previewPath =
    preview && item
      ? preview.replace(/\${(.*?)}/g, (_, key) =>
          typeof item[key] === "string" || typeof item[key] === "number"
            ? String(item[key])
            : "",
        )
      : undefined;
  const previewUrl = previewPath
    ? `${previewPath}${previewPath.includes("?") ? "&" : "?"}preview`
    : undefined;

  return (
    <div className="flex gap-4 border-b">
      <div className="flex grow gap-1">
        {!single && (
          <>
            <IconButton
              disabled={!isDirty || mutation.isPending || hasUploads}
              isPending={
                mutation.isPending && mutation.variables.submitter === "new"
              }
              className={isDirty ? "" : "hidden"}
              name="action"
              value="new"
              tooltip="New Entry"
            >
              <Plus className="size-6 text-gray-800" />
            </IconButton>
            <IconButton
              className={isDirty ? "hidden" : ""}
              tooltip="New Entry"
              asChild
            >
              <Link
                href={
                  listPath +
                  "/new" +
                  (searchParams.size ? "?" + searchParams : "")
                }
              >
                <Plus className="size-6 text-gray-800" />
              </Link>
            </IconButton>

            <IconButton
              disabled={!isDirty || mutation.isPending || hasUploads}
              isPending={
                mutation.isPending && mutation.variables.submitter === "list"
              }
              className={isDirty ? "" : "hidden"}
              name="action"
              value="list"
              tooltip="Go To List"
            >
              <List className="size-6 text-gray-800" />
            </IconButton>
            <IconButton
              className={isDirty ? "hidden" : ""}
              tooltip="Go To List"
              asChild
            >
              <Link
                href={listPath + (searchParams.size ? "?" + searchParams : "")}
              >
                <List className="size-6 text-gray-800" />
              </Link>
            </IconButton>
          </>
        )}

        <IconButton
          disabled={!isDirty || mutation.isPending || hasUploads}
          isPending={
            mutation.isPending && mutation.variables.submitter === "save"
          }
          name="action"
          value="save"
          tooltip="Save"
        >
          <Save className="size-6 text-gray-800" />
        </IconButton>
      </div>
      <div className="">
        {previewUrl && !isNew && !isDeleted && (
          <IconButton
            type="button"
            disabled={isNew}
            tooltip="View Content"
            onClick={() => window.open(previewUrl, "_blank")}
          >
            <ScanEye className="size-6 text-gray-800" />
          </IconButton>
        )}

        {!single && (
          <>
            <RestoreButton />
            <DeleteButton />
          </>
        )}
        {/* <IconButton
          disabled={isDirty || mutation.isPending}
          type="button"
          tooltip="Delete"
        >
          <Trash className="size-6 text-gray-800" />
        </IconButton> */}
      </div>
    </div>
  );
}

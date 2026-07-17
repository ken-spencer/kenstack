import { and, eq } from "drizzle-orm";
import type * as z from "zod";

import { selectMediaSubquery } from "@kenstack/db/tables";
import { media } from "@kenstack/db/tables/media";
import { documentMimeTypes } from "@kenstack/db/tables/media/mimeTypes";
import { fileSchema } from "@kenstack/zod/file";
import type { DefinedField, MediaUploadOptions } from "../types";
import type {
  FieldAfterSave,
  FieldPreSaveContext,
  FieldPreSaveResult,
  ServerFieldResolver,
} from ".";

export function fileField(): ServerFieldResolver<
  DefinedField<"file"> & MediaUploadOptions
> {
  return (field) => ({
    upload: {
      accept: field.accept ?? documentMimeTypes,
      maxSize: field.uploadMaxSize,
      maxSizeMessage: field.uploadMaxSizeMessage,
    },
    listSelect: ({ column }) =>
      column ? selectMediaSubquery(column, "original") : undefined,
    select: ({ column }) =>
      column ? selectMediaSubquery(column, "original") : undefined,
    preSave: prepareFileSave,
  });
}

async function prepareFileSave({
  db,
  key,
  column,
  value,
  id,
  user,
  table,
  shouldSaveField,
}: FieldPreSaveContext): Promise<FieldPreSaveResult> {
  const fieldData = value as z.output<typeof fileSchema>;

  if (!shouldSaveField(key)) {
    return { status: "success", remove: true };
  }

  if (!column) {
    return {
      status: "error",
      message: `File field "${key}" does not map to a table column.`,
    };
  }

  const [oldRow] = id
    ? await db
        .select({ mediaId: column })
        .from(table)
        .where(eq(table.id, id))
        .limit(1)
    : [];
  const oldMediaId =
    oldRow && typeof oldRow.mediaId === "number" ? oldRow.mediaId : null;

  if (
    fieldData === null ||
    (typeof fieldData === "object" &&
      "action" in fieldData &&
      fieldData.action === "remove")
  ) {
    const afterSave: FieldAfterSave[] = oldMediaId
      ? [
          (tx) =>
            tx
              .update(media)
              .set({ status: "removed" })
              .where(eq(media.id, oldMediaId)),
        ]
      : [];

    return { status: "success", value: null, afterSave };
  }

  let nextFileId: number | undefined;

  if (typeof fieldData === "number" || !("action" in fieldData)) {
    const selectedFileId =
      typeof fieldData === "number" ? fieldData : fieldData.id;

    if (typeof selectedFileId !== "number") {
      return { status: "error", message: "Could not find the selected file." };
    }

    const [selectedFile] = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.id, selectedFileId), eq(media.kind, "file")))
      .limit(1);

    nextFileId = selectedFile?.id;
  } else {
    const [uploadedFile] = await db
      .select({ id: media.id, status: media.status })
      .from(media)
      .where(
        and(
          eq(media.publicId, fieldData.mediaId),
          eq(media.createdBy, user.id),
          eq(media.kind, "file"),
        ),
      )
      .limit(1);

    if (!uploadedFile) {
      return { status: "error", message: "Could not find the uploaded file." };
    }

    if (uploadedFile.id !== oldMediaId && uploadedFile.status !== "uploaded") {
      return {
        status: "error",
        message: "The selected file has not finished uploading.",
      };
    }

    nextFileId = uploadedFile.id;
  }

  if (nextFileId === undefined) {
    return { status: "error", message: "Could not find the selected file." };
  }

  if (nextFileId === oldMediaId) {
    return { status: "success", remove: true };
  }

  const afterSave: FieldAfterSave[] = [
    async (tx) => {
      await tx
        .update(media)
        .set({ status: "attached" })
        .where(eq(media.id, nextFileId));

      if (oldMediaId) {
        await tx
          .update(media)
          .set({ status: "removed" })
          .where(eq(media.id, oldMediaId));
      }
    },
  ];

  return {
    status: "success",
    value: nextFileId,
    afterSave,
  };
}

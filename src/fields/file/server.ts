import "server-only";

import { and, eq } from "drizzle-orm";
import type * as z from "zod";

import { selectMediaSubquery } from "@kenstack/db/queries/media";
import { media } from "@kenstack/db/tables/media";
import { documentMimeTypes } from "@kenstack/db/tables/media/mimeTypes";
import { fileField as createFileField, fileSchema } from ".";
import type { FieldOption, MediaUploadOptions } from "../field";
import type {
  FieldAfterSave,
  FieldPreSaveContext,
  FieldPreSaveResult,
} from "../serverField";
import {
  serverField,
  type ServerFieldRegistration,
  type SelectedServerFieldResolverFor,
} from "../serverField";
import { attachMediaAfterSave } from "../internal/media/attachment";

type FileFieldOption = FieldOption &
  MediaUploadOptions & { zod: z.ZodType<z.output<typeof fileSchema>> };

export function fileField(): SelectedServerFieldResolverFor<
  ReturnType<typeof createFileField>,
  ReturnType<typeof selectMediaSubquery>
>;
export function fileField<const TField extends FileFieldOption>(
  field: TField,
): SelectedServerFieldResolverFor<
  TField,
  ReturnType<typeof selectMediaSubquery>
>;
export function fileField(
  field: FileFieldOption = createFileField(),
): ServerFieldRegistration {
  return serverField(field, (configuredField) => ({
    upload: {
      accept: configuredField.accept ?? documentMimeTypes,
      maxSize: configuredField.uploadMaxSize,
      maxSizeMessage: configuredField.uploadMaxSizeMessage,
    },
    listSelect: ({ column }) =>
      column ? selectMediaSubquery(column) : undefined,
    select: ({ column }) => (column ? selectMediaSubquery(column) : undefined),
    preSave: prepareFileSave,
  }));
}

async function prepareFileSave({
  admin,
  db,
  key,
  column,
  value,
  id,
  user,
  table,
  shouldSaveField,
}: FieldPreSaveContext<
  z.output<typeof fileSchema>
>): Promise<FieldPreSaveResult> {
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
    value === null ||
    (typeof value === "object" &&
      "action" in value &&
      value.action === "remove")
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

  if (typeof value === "number" || !("action" in value)) {
    const selectedFileId = typeof value === "number" ? value : value.id;

    if (
      selectedFileId === undefined ||
      (!admin && selectedFileId !== oldMediaId)
    ) {
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
          eq(media.publicId, value.mediaId),
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

  return {
    status: "success",
    value: nextFileId,
    afterSave: [attachMediaAfterSave(nextFileId, oldMediaId, undefined)],
  };
}

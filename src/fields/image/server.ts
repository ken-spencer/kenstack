import "server-only";

import { and, eq, ne } from "drizzle-orm";
import type * as z from "zod";
import isEqual from "lodash-es/isEqual";

import { selectImageSubquery } from "@kenstack/db/tables";
import { media } from "@kenstack/db/tables/media";
import {
  imageField as createImageField,
  imageSchema,
  type ImageVariant,
} from ".";
import type { FieldOption } from "../field";
import type {
  FieldAfterSave,
  FieldPrepareSaveContext,
  FieldPreSaveContext,
  FieldPreSaveResult,
} from "../serverField";
import {
  serverField,
  type ServerFieldRegistration,
  type SelectedServerFieldResolverFor,
} from "../serverField";
import {
  attachMediaAfterSave,
  imageMetadata,
} from "../internal/media/attachment";
import { prepareMediaCrop } from "../internal/media/crop";

export { imageMetadata } from "../internal/media/attachment";

type ImageFieldOption = FieldOption & {
  selectVariant?: ImageVariant;
  zod: z.ZodType<z.output<typeof imageSchema>>;
};

type ImageFieldOptions = { variant?: ImageVariant };

export function imageField(): SelectedServerFieldResolverFor<
  ReturnType<typeof createImageField>,
  ReturnType<typeof selectImageSubquery>
>;
export function imageField<const TField extends ImageFieldOption>(
  field: TField,
  options?: ImageFieldOptions,
): SelectedServerFieldResolverFor<
  TField,
  ReturnType<typeof selectImageSubquery>
>;
export function imageField(
  field: ImageFieldOption = createImageField(),
  options: ImageFieldOptions = {},
): ServerFieldRegistration {
  return serverField(field, (configuredField) => {
    const selectVariant =
      options.variant ?? configuredField.selectVariant ?? "square";

    return {
      upload: true,
      listSelect: ({ column }) =>
        column
          ? selectImageSubquery(
              column,
              typeof configuredField.list === "string"
                ? configuredField.list
                : "square",
            )
          : undefined,
      select: ({ column }) =>
        column ? selectImageSubquery(column, selectVariant) : undefined,
      preSave: prepareImageSave,
      prepareSave: prepareImageCrop,
    };
  });
}

async function prepareImageCrop({
  admin,
  column,
  db,
  id,
  table,
  user,
  value,
}: FieldPrepareSaveContext<z.output<typeof imageSchema>>) {
  if (
    !column ||
    !value ||
    typeof value !== "object" ||
    !("squareCropChanged" in value) ||
    !value.squareCropChanged
  ) {
    return { status: "success" as const };
  }

  const oldRow = id
    ? (
        await db
          .select({ mediaId: column })
          .from(table)
          .where(eq(table.id, id))
          .limit(1)
      )[0]
    : undefined;
  const allowedMediaIds = new Set<number>();
  if (oldRow && typeof oldRow.mediaId === "number") {
    allowedMediaIds.add(oldRow.mediaId);
  }
  if (admin && "id" in value && value.id !== undefined) {
    allowedMediaIds.add(value.id);
  }

  const prepared = await prepareMediaCrop({
    allowedMediaIds,
    db,
    item: value,
    userId: user.id,
  });
  if (!prepared) {
    return { status: "success" as const };
  }

  return {
    status: "success" as const,
    value: prepared.item,
    savedValue: prepared.item,
    afterSave: [prepared.afterSave],
    afterCommit: [prepared.afterCommit],
    afterFailure: [prepared.afterFailure],
  };
}

async function prepareImageSave({
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
  z.output<typeof imageSchema>
>): Promise<FieldPreSaveResult> {
  if (!shouldSaveField(key)) {
    return { status: "success", remove: true };
  }

  if (!column) {
    return {
      status: "error",
      message: `Image field "${key}" does not map to a table column.`,
    };
  }

  const oldRow = id
    ? (
        await db
          .select({ mediaId: column })
          .from(table)
          .where(eq(table.id, id))
          .limit(1)
      )[0]
    : undefined;
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

  if (typeof value === "number" || !("action" in value)) {
    const selectedImageId = typeof value === "number" ? value : value.id;

    if (selectedImageId === undefined) {
      return {
        status: "error",
        message: "Could not find the selected image.",
      };
    }

    const [selectedImage] = await db
      .select({
        id: media.id,
        alt: media.alt,
        title: media.title,
        caption: media.caption,
      })
      .from(media)
      .where(and(eq(media.id, selectedImageId), ne(media.kind, "file")))
      .limit(1);

    if (!selectedImage) {
      return {
        status: "error",
        message: "Could not find the selected image.",
      };
    }

    if (!admin && selectedImage.id !== oldMediaId) {
      return {
        status: "error",
        message: "Could not find the selected image.",
      };
    }

    const metadata =
      admin && typeof value !== "number" ? imageMetadata(value) : undefined;
    const metadataChanged =
      metadata !== undefined &&
      !isEqual(metadata, {
        alt: selectedImage.alt,
        title: selectedImage.title,
        caption: selectedImage.caption,
      });

    if (selectedImage.id === oldMediaId) {
      const afterSave: FieldAfterSave[] = metadataChanged
        ? [
            (tx) =>
              tx
                .update(media)
                .set(metadata)
                .where(eq(media.id, selectedImage.id)),
          ]
        : [];

      return { status: "success", remove: true, afterSave };
    }

    return {
      status: "success",
      value: selectedImage.id,
      afterSave: [attachMediaAfterSave(selectedImage.id, oldMediaId, metadata)],
    };
  }

  if (value.action === "upload") {
    const [uploadedImage] = await db
      .select({ id: media.id, status: media.status })
      .from(media)
      .where(
        and(
          eq(media.publicId, value.imageId),
          eq(media.createdBy, user.id),
          ne(media.kind, "file"),
        ),
      )
      .limit(1);

    if (!uploadedImage) {
      return {
        status: "error",
        message: "Could not find the uploaded image.",
      };
    }

    if (
      uploadedImage.id !== oldMediaId &&
      uploadedImage.status !== "uploaded"
    ) {
      return {
        status: "error",
        message: "The selected image has not finished uploading.",
      };
    }

    if (uploadedImage.id === oldMediaId) {
      return { status: "success", remove: true };
    }

    return {
      status: "success",
      value: uploadedImage.id,
      afterSave: [
        attachMediaAfterSave(
          uploadedImage.id,
          oldMediaId,
          admin ? imageMetadata(value) : undefined,
        ),
      ],
    };
  }

  return {
    status: "error",
    message: "invalid image data",
  };
}

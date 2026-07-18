import { and, eq, ne } from "drizzle-orm";
import type * as z from "zod";
import isEqual from "lodash-es/isEqual";

import { selectMediaSubquery } from "@kenstack/db/tables";
import { media } from "@kenstack/db/tables/media";
import { imageSchema } from "@kenstack/zod/image";
import type { DefinedField } from "../types";
import type {
  FieldAfterSave,
  FieldPreSaveContext,
  FieldPreSaveResult,
  ServerFieldResolver,
} from ".";

export type ImageVariant = "square" | "original";

export function imageField({
  variant = "square",
}: { variant?: ImageVariant } = {}): ServerFieldResolver<
  DefinedField<"image">
> {
  return (field) => ({
    upload: true,
    listSelect: ({ column }) => {
      return column
        ? selectMediaSubquery(
            column,
            typeof field.list === "string" ? field.list : "square",
          )
        : undefined;
    },
    select: ({ column }) => {
      return column ? selectMediaSubquery(column, variant) : undefined;
    },
    preSave: prepareImageSave,
  });
}

export async function prepareImageSave({
  db,
  key,
  column,
  value,
  id,
  user,
  table,
  shouldSaveField,
}: FieldPreSaveContext): Promise<FieldPreSaveResult> {
  const afterSave: FieldAfterSave[] = [];
  const fieldData = value as z.output<typeof imageSchema>;

  if (!shouldSaveField(key)) {
    return { status: "success", remove: true };
  }

  if (!column) {
    return {
      status: "error",
      message: `Image field "${key}" does not map to a table column.`,
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
    if (oldMediaId) {
      afterSave.push((tx) =>
        tx
          .update(media)
          .set({ status: "removed" })
          .where(eq(media.id, oldMediaId)),
      );
    }

    return { status: "success", value: null, afterSave };
  } else if (typeof fieldData === "number" || !("action" in fieldData)) {
    const selectedImageId =
      typeof fieldData === "number" ? fieldData : fieldData.id;

    if (typeof selectedImageId !== "number") {
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

    const metadata =
      typeof fieldData === "number" ? undefined : imageMetadata(fieldData);
    const metadataChanged =
      metadata !== undefined &&
      !isEqual(metadata, {
        alt: selectedImage.alt,
        title: selectedImage.title,
        caption: selectedImage.caption,
      });

    if (selectedImage.id === oldMediaId) {
      if (metadataChanged) {
        afterSave.push((tx) =>
          tx.update(media).set(metadata).where(eq(media.id, selectedImage.id)),
        );
      }

      return { status: "success", remove: true, afterSave };
    }

    afterSave.push(
      attachMediaAfterSave(selectedImage.id, oldMediaId, metadata),
    );

    return {
      status: "success",
      value: selectedImage.id,
      afterSave,
    };
  } else if (fieldData.action === "upload") {
    const [uploadedImage] = await db
      .select({ id: media.id, status: media.status })
      .from(media)
      .where(
        and(
          eq(media.publicId, fieldData.imageId),
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

    afterSave.push(
      attachMediaAfterSave(
        uploadedImage.id,
        oldMediaId,
        imageMetadata(fieldData),
      ),
    );
    return {
      status: "success",
      value: uploadedImage.id,
      afterSave,
    };
  } else {
    return {
      status: "error",
      message: "invalid image data",
    };
  }
}

function attachMediaAfterSave(
  mediaId: number,
  oldMediaId: number | null,
  metadata: ImageMetadataInput | undefined,
): FieldAfterSave {
  return async (tx) => {
    await tx
      .update(media)
      .set({ status: "attached", ...metadata })
      .where(eq(media.id, mediaId));

    if (oldMediaId) {
      await tx
        .update(media)
        .set({ status: "removed" })
        .where(eq(media.id, oldMediaId));
    }
  };
}

type ImageMetadataInput = {
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
};

const imageMetadataKeys = ["alt", "title", "caption"] as const;

export function imageMetadata(input: ImageMetadataInput) {
  return Object.fromEntries(
    imageMetadataKeys.map((key) => [key, input[key] ?? null]),
  );
}

import { and, eq, sql } from "drizzle-orm";
import type * as z from "zod";
import isEqual from "lodash-es/isEqual";

import { selectImageSubquery } from "@kenstack/db/tables";
import { images } from "@kenstack/db/tables/images";
import { imageSchema } from "@kenstack/zod/image";
import type { DefinedField } from "../types";
import type {
  FieldAfterSave,
  FieldPreSaveContext,
  FieldPreSaveResult,
  ServerFieldDefaults,
  ServerFieldResolver,
} from ".";

export type ImageVariant = "square" | "original";

export function imageField(
  { variant = "square" }: { variant?: ImageVariant } = {},
): ServerFieldResolver<DefinedField<"image">> {
  return (field): ServerFieldDefaults => ({
    behavior: {
      upload: true,
      listSelect: ({ column }) => {
        return column
          ? selectImageSubquery(
              column,
              typeof field.list === "string" ? field.list : "square",
            )
          : undefined;
      },
      select: ({ column }) => {
        return column ? selectImageSubquery(column, variant) : undefined;
      },
      preSave: prepareImageSave,
    },
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

  if (typeof fieldData === "number") {
    return { status: "success", remove: true };
  }

  if (!column) {
    return {
      status: "error",
      message: `Image field "${key}" does not map to a table column.`,
    };
  }

  if (
    id &&
    (fieldData === null ||
      ("action" in fieldData && fieldData.action === "remove"))
  ) {
    const [oldRow] = await db
      .select({ removeId: column })
      .from(table)
      .where(eq(table.id, id))
      .limit(1);

    afterSave.push(async (tx) => {
      if (oldRow && typeof oldRow.removeId === "number") {
        return tx
          .update(images)
          .set({ status: "removed" })
          .where(eq(images.id, oldRow.removeId));
      }
    });
    return { status: "success", value: null, afterSave };
  } else if (fieldData === null) {
    return { status: "success" };
  } else if (typeof fieldData === "number") {
    return { status: "success", remove: true };
  } else if (!("action" in fieldData)) {
    if (typeof fieldData.id === "number") {
      const imageId = fieldData.id;
      const metadata = imageMetadata(fieldData);
      const [image] = await db
        .select({
          alt: images.alt,
          title: images.title,
          caption: images.caption,
        })
        .from(images)
        .where(eq(images.id, imageId))
        .limit(1);

      if (
        !image ||
        !isEqual(metadata, {
          alt: image.alt,
          title: image.title,
          caption: image.caption,
        })
      ) {
        afterSave.push((tx) =>
          tx
            .update(images)
            .set(metadata)
            .where(eq(images.id, imageId)),
        );
      }
    }
    return { status: "success", remove: true, afterSave };
  } else if (fieldData.action === "upload") {
    const imageIdQuery = db
      .select({ id: images.id })
      .from(images)
      .where(
        and(
          eq(images.publicId, fieldData.imageId),
          eq(images.createdBy, user.id),
        ),
      )
      .limit(1);

    afterSave.push((tx) =>
      tx
        .update(images)
        .set({
          status: "attached",
          ...imageMetadata(fieldData),
        })
        .where(
          and(
            eq(images.publicId, fieldData.imageId),
            eq(images.createdBy, user.id),
          ),
        ),
    );
    return {
      status: "success",
      value: sql<number>`(${imageIdQuery})`,
      afterSave,
    };
  } else {
    return {
      status: "error",
      message: "invalid image data",
    };
  }
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

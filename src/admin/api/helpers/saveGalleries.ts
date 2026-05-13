import { and, eq, inArray } from "drizzle-orm";
import type * as z from "zod";

import type { ImageGalleryConfig } from "@kenstack/admin";
import type { deps } from "@app/deps";
import { images } from "@kenstack/db/tables";
import type { User } from "@kenstack/types";
import { gallerySchema } from "@kenstack/zod/gallery";

type GalleryValues = Record<string, z.output<typeof gallerySchema>>;
type TransactionDb = Parameters<
  Parameters<(typeof deps)["db"]["transaction"]>[0]
>[0];

export function extractGalleryValues({
  data,
  galleries,
}: {
  data: Record<string, unknown>;
  galleries?: Record<string, ImageGalleryConfig>;
}) {
  const values: GalleryValues = {};

  if (!galleries) {
    return values;
  }

  for (const key of Object.keys(galleries)) {
    const value = data[key];
    if (!Array.isArray(value)) {
      continue;
    }

    values[key] = gallerySchema.parse(value);
  }

  return values;
}

export async function saveGalleries({
  db,
  tableId,
  galleries,
  values,
  user,
}: {
  db: TransactionDb;
  tableId: number;
  galleries: Record<string, ImageGalleryConfig>;
  values: GalleryValues;
  user: User;
}) {
  const savedValues: GalleryValues = {};

  for (const [key, selected] of Object.entries(values)) {
    const gallery = galleries[key];
    if (!gallery) {
      continue;
    }

    const oldRows = await db
      .select({ imageId: gallery.imageId })
      .from(gallery.table)
      .where(eq(gallery.tableId, tableId));

    const oldImageIds = oldRows.map((row) => row.imageId);
    const imageIds: number[] = [];
    const metadataByImageId = new Map<
      number,
      { alt?: string | null; title?: string | null; caption?: string | null }
    >();

    for (const item of selected) {
      if ("action" in item && item.action === "upload") {
        const [image] = await db
          .select({ id: images.id })
          .from(images)
          .where(
            and(
              eq(images.publicId, item.imageId),
              eq(images.createdBy, user.id),
            ),
          )
          .limit(1);

        if (image) {
          imageIds.push(image.id);
          metadataByImageId.set(image.id, {
            alt: item.alt ?? null,
            title: item.title ?? null,
            caption: item.caption ?? null,
          });
        }
      } else if (typeof item.id === "number") {
        imageIds.push(item.id);
        metadataByImageId.set(item.id, {
          alt: item.alt ?? null,
          title: item.title ?? null,
          caption: item.caption ?? null,
        });
      }
    }

    await db.delete(gallery.table).where(eq(gallery.tableId, tableId));

    if (imageIds.length) {
      await db.insert(gallery.table).values(
        imageIds.map((imageId, index) => ({
          [gallery.tableIdKey]: tableId,
          [gallery.imageIdKey]: imageId,
          [gallery.sortOrderKey]: index,
        })),
      );

      await db
        .update(images)
        .set({ status: "attached" })
        .where(inArray(images.id, imageIds));

      await Promise.all(
        [...metadataByImageId.entries()].map(([imageId, metadata]) =>
          db.update(images).set(metadata).where(eq(images.id, imageId)),
        ),
      );
    }

    const removedImageIds = oldImageIds.filter(
      (imageId) => !imageIds.includes(imageId),
    );

    if (removedImageIds.length) {
      await db
        .update(images)
        .set({ status: "removed" })
        .where(inArray(images.id, removedImageIds));
    }

    savedValues[key] = selected;
  }

  return savedValues;
}

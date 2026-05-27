import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type * as z from "zod";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import isEqual from "lodash-es/isEqual";

import type { deps } from "@app/deps";
import { images, selectImageSubquery } from "@kenstack/db/tables";
import type { User } from "@kenstack/types";
import { gallerySchema } from "@kenstack/zod/gallery";
import type { ServerField, ServerFieldDefaults, ServerFieldResolver } from ".";
import { imageMetadata } from "./image";

type ImageGalleryConfig = {
  table: AnyPgTable;
  tableIdKey: string;
  tableId: AnyPgColumn<{ data: number }>;
  imageIdKey: string;
  imageId: AnyPgColumn<{ data: number }>;
  sortOrderKey: string;
  sortOrder: AnyPgColumn<{ data: number }>;
};

type ImageGalleryTable = AnyPgTable & {
  tableId: AnyPgColumn<{ data: number }>;
  imageId: AnyPgColumn<{ data: number }>;
  sortOrder: AnyPgColumn<{ data: number }>;
};

type ImageGalleryHandlerConfig = {
  table: ImageGalleryTable;
  tableIdKey?: string;
  tableId?: AnyPgColumn<{ data: number }>;
  imageIdKey?: string;
  imageId?: AnyPgColumn<{ data: number }>;
  sortOrderKey?: string;
  sortOrder?: AnyPgColumn<{ data: number }>;
};

export function galleryField(
  {
    table,
    tableIdKey = "tableId",
    tableId = table.tableId,
    imageIdKey = "imageId",
    imageId = table.imageId,
    sortOrderKey = "sortOrder",
    sortOrder = table.sortOrder,
  }: ImageGalleryHandlerConfig,
): ServerFieldResolver<ServerField & { kind: "gallery" }> {
  const gallery = {
    table,
    tableIdKey,
    tableId,
    imageIdKey,
    imageId,
    sortOrderKey,
    sortOrder,
  };

  return (): ServerFieldDefaults => ({
    behavior: {
      upload: true,
      async load({ db, key, tableId }) {
        const values = await loadGalleries({
          db,
          tableId,
          galleries: { [key]: gallery },
        });

        return values[key] ?? [];
      },
      async save({ db, key, tableId, value, user }) {
        const values = await saveGalleries({
          db,
          tableId,
          galleries: { [key]: gallery },
          values: { [key]: value as z.output<typeof gallerySchema> },
          user,
        });

        return values[key] ?? [];
      },
    },
  });
}

type GalleryValues = Record<string, z.output<typeof gallerySchema>>;
type TransactionDb = Parameters<
  Parameters<(typeof deps)["db"]["transaction"]>[0]
>[0];

async function loadGalleries({
  db,
  tableId,
  galleries,
}: {
  db: Pick<typeof deps.db, "select">;
  tableId: number;
  galleries?: Record<string, ImageGalleryConfig>;
}) {
  const values: Record<string, unknown[]> = {};

  if (!galleries) {
    return values;
  }

  for (const [key, gallery] of Object.entries(galleries)) {
    const rows = await db
      .select({
        id: gallery.imageId,
        image: selectImageSubquery(gallery.imageId, "square"),
        filename: images.filename,
        sourceType: images.sourceType,
        sourceSize: images.sourceSize,
        sourceWidth: images.sourceWidth,
        sourceHeight: images.sourceHeight,
        originalUrl: sql<string | null>`
          case
            when ${images.kind} = 'svg' then ${images.sourceUrl}
            else ${images.variants}->'original'->>'url'
          end
        `,
        title: images.title,
        caption: images.caption,
      })
      .from(gallery.table)
      .innerJoin(images, eq(gallery.imageId, images.id))
      .where(eq(gallery.tableId, tableId))
      .orderBy(asc(gallery.sortOrder));

    values[key] = rows
      .filter((row) => row.image)
      .map((row) => ({
        id: row.id,
        ...row.image,
        filename: row.filename,
        sourceType: row.sourceType,
        sourceSize: row.sourceSize,
        sourceWidth: row.sourceWidth,
        sourceHeight: row.sourceHeight,
        originalUrl: row.originalUrl,
        title: row.title,
        caption: row.caption,
      }));
  }

  return values;
}

async function saveGalleries({
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
      .select({
        imageId: gallery.imageId,
        alt: images.alt,
        title: images.title,
        caption: images.caption,
      })
      .from(gallery.table)
      .innerJoin(images, eq(gallery.imageId, images.id))
      .where(eq(gallery.tableId, tableId))
      .orderBy(asc(gallery.sortOrder));

    const oldImageIds = oldRows
      .map((row) => row.imageId)
      .filter((imageId): imageId is number => typeof imageId === "number");
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
          metadataByImageId.set(image.id, imageMetadata(item));
        }
      } else if (typeof item.id === "number") {
        imageIds.push(item.id);
        metadataByImageId.set(item.id, imageMetadata(item));
      }
    }

    const addedImageIds = imageIds.filter(
      (imageId) => !oldImageIds.includes(imageId),
    );
    const removedImageIds = oldImageIds.filter(
      (imageId) => !imageIds.includes(imageId),
    );
    const movedImageIds = imageIds.filter((imageId, index) => {
      return oldImageIds.includes(imageId) && oldImageIds[index] !== imageId;
    });
    const changedMetadata = [...metadataByImageId.entries()].filter(
      ([imageId, metadata]) => {
        const row = oldRows.find((oldRow) => oldRow.imageId === imageId);
        return (
          !row ||
          !isEqual(metadata, {
            alt: row.alt,
            title: row.title,
            caption: row.caption,
          })
        );
      },
    );

    if (addedImageIds.length) {
      await db.insert(gallery.table).values(
        addedImageIds.map((imageId) => ({
          [gallery.tableIdKey]: tableId,
          [gallery.imageIdKey]: imageId,
          [gallery.sortOrderKey]: imageIds.indexOf(imageId),
        })),
      );

      await db
        .update(images)
        .set({ status: "attached" })
        .where(inArray(images.id, addedImageIds));
    }

    await Promise.all([
      ...movedImageIds.map((imageId) =>
        db
          .update(gallery.table)
          .set({ [gallery.sortOrderKey]: imageIds.indexOf(imageId) })
          .where(
            and(
              eq(gallery.tableId, tableId),
              eq(gallery.imageId, imageId),
            ),
          ),
      ),
      ...changedMetadata.map(([imageId, metadata]) =>
        db.update(images).set(metadata).where(eq(images.id, imageId)),
      ),
    ]);

    if (removedImageIds.length) {
      await db
        .delete(gallery.table)
        .where(
          and(
            eq(gallery.tableId, tableId),
            inArray(gallery.imageId, removedImageIds),
          ),
        );

      await db
        .update(images)
        .set({ status: "removed" })
        .where(inArray(images.id, removedImageIds));
    }

    savedValues[key] = selected;
  }

  return savedValues;
}

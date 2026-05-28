import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type * as z from "zod";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import isEqual from "lodash-es/isEqual";

import type { deps } from "@app/deps";
import { images, selectImageSubquery } from "@kenstack/db/tables";
import type { User } from "@kenstack/types";
import { mediaSchema } from "@kenstack/zod/media";
import type { ServerField, ServerFieldDefaults, ServerFieldResolver } from ".";
import { imageMetadata } from "./image";

type MediaConfig = {
  table: AnyPgTable;
  tableIdKey: string;
  tableId: AnyPgColumn<{ data: number }>;
  imageIdKey: string;
  imageId: AnyPgColumn<{ data: number }>;
  sortOrderKey: string;
  sortOrder: AnyPgColumn<{ data: number }>;
};

type MediaTable = AnyPgTable & {
  tableId: AnyPgColumn<{ data: number }>;
  imageId: AnyPgColumn<{ data: number }>;
  sortOrder: AnyPgColumn<{ data: number }>;
};

type MediaHandlerConfig = {
  table: MediaTable;
  tableIdKey?: string;
  tableId?: AnyPgColumn<{ data: number }>;
  imageIdKey?: string;
  imageId?: AnyPgColumn<{ data: number }>;
  sortOrderKey?: string;
  sortOrder?: AnyPgColumn<{ data: number }>;
};

export function mediaField(
  {
    table,
    tableIdKey = "tableId",
    tableId = table.tableId,
    imageIdKey = "imageId",
    imageId = table.imageId,
    sortOrderKey = "sortOrder",
    sortOrder = table.sortOrder,
  }: MediaHandlerConfig,
): ServerFieldResolver<ServerField & { kind: "media" }> {
  const media = {
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
        const values = await loadMedia({
          db,
          tableId,
          media: { [key]: media },
        });

        return values[key] ?? [];
      },
      async save({ db, key, tableId, value, user }) {
        const values = await saveMedia({
          db,
          tableId,
          media: { [key]: media },
          values: { [key]: value as z.output<typeof mediaSchema> },
          user,
        });

        return values[key] ?? [];
      },
    },
  });
}

type MediaValues = Record<string, z.output<typeof mediaSchema>>;
type TransactionDb = Parameters<
  Parameters<(typeof deps)["db"]["transaction"]>[0]
>[0];

async function loadMedia({
  db,
  tableId,
  media,
}: {
  db: Pick<typeof deps.db, "select">;
  tableId: number;
  media?: Record<string, MediaConfig>;
}) {
  const values: Record<string, unknown[]> = {};

  if (!media) {
    return values;
  }

  for (const [key, mediaConfig] of Object.entries(media)) {
    const rows = await db
      .select({
        id: mediaConfig.imageId,
        image: selectImageSubquery(mediaConfig.imageId, "square"),
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
      .from(mediaConfig.table)
      .innerJoin(images, eq(mediaConfig.imageId, images.id))
      .where(eq(mediaConfig.tableId, tableId))
      .orderBy(asc(mediaConfig.sortOrder));

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

async function saveMedia({
  db,
  tableId,
  media,
  values,
  user,
}: {
  db: TransactionDb;
  tableId: number;
  media: Record<string, MediaConfig>;
  values: MediaValues;
  user: User;
}) {
  const savedValues: MediaValues = {};

  for (const [key, selected] of Object.entries(values)) {
    const mediaConfig = media[key];
    if (!mediaConfig) {
      continue;
    }

    const oldRows = await db
      .select({
        imageId: mediaConfig.imageId,
        alt: images.alt,
        title: images.title,
        caption: images.caption,
      })
      .from(mediaConfig.table)
      .innerJoin(images, eq(mediaConfig.imageId, images.id))
      .where(eq(mediaConfig.tableId, tableId))
      .orderBy(asc(mediaConfig.sortOrder));

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
      await db.insert(mediaConfig.table).values(
        addedImageIds.map((imageId) => ({
          [mediaConfig.tableIdKey]: tableId,
          [mediaConfig.imageIdKey]: imageId,
          [mediaConfig.sortOrderKey]: imageIds.indexOf(imageId),
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
          .update(mediaConfig.table)
          .set({ [mediaConfig.sortOrderKey]: imageIds.indexOf(imageId) })
          .where(
            and(
              eq(mediaConfig.tableId, tableId),
              eq(mediaConfig.imageId, imageId),
            ),
          ),
      ),
      ...changedMetadata.map(([imageId, metadata]) =>
        db.update(images).set(metadata).where(eq(images.id, imageId)),
      ),
    ]);

    if (removedImageIds.length) {
      await db
        .delete(mediaConfig.table)
        .where(
          and(
            eq(mediaConfig.tableId, tableId),
            inArray(mediaConfig.imageId, removedImageIds),
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

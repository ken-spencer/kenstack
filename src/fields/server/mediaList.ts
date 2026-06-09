import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type * as z from "zod";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import isEqual from "lodash-es/isEqual";

import type { deps } from "@app/deps";
import { media as mediaTable, selectMediaSubquery } from "@kenstack/db/tables";
import type { User } from "@kenstack/types";
import { mediaListSchema } from "@kenstack/zod/mediaList";
import type { DefinedField, MediaListUploadOptions } from "../types";
import type { ServerFieldDefaults, ServerFieldResolver } from ".";
import { imageMetadata } from "./image";

type MediaConfig = {
  table: AnyPgTable;
  tableIdKey: string;
  tableId: AnyPgColumn<{ data: number }>;
  mediaIdKey: string;
  mediaId: AnyPgColumn<{ data: number }>;
  sortOrderKey: string;
  sortOrder: AnyPgColumn<{ data: number }>;
};

type MediaTable = AnyPgTable & {
  tableId: AnyPgColumn<{ data: number }>;
  mediaId: AnyPgColumn<{ data: number }>;
  sortOrder: AnyPgColumn<{ data: number }>;
};

type MediaHandlerConfig = {
  table: MediaTable;
  tableIdKey?: string;
  tableId?: AnyPgColumn<{ data: number }>;
  mediaIdKey?: string;
  mediaId?: AnyPgColumn<{ data: number }>;
  sortOrderKey?: string;
  sortOrder?: AnyPgColumn<{ data: number }>;
};

export function mediaListField({
  table,
  tableIdKey = "tableId",
  tableId = table.tableId,
  mediaIdKey = "mediaId",
  mediaId = table.mediaId,
  sortOrderKey = "sortOrder",
  sortOrder = table.sortOrder,
}: MediaHandlerConfig): ServerFieldResolver<
  DefinedField<"media-list"> & MediaListUploadOptions
> {
  const media = {
    table,
    tableIdKey,
    tableId,
    mediaIdKey,
    mediaId,
    sortOrderKey,
    sortOrder,
  };

  return (field): ServerFieldDefaults => ({
    behavior: {
      upload: {
        accept: field.accept,
        maxSize: field.uploadMaxSize,
        maxSizeMessage: field.uploadMaxSizeMessage,
      },
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
          values: { [key]: value as z.output<typeof mediaListSchema> },
          user,
        });

        return values[key] ?? [];
      },
    },
  });
}

type MediaValues = Record<string, z.output<typeof mediaListSchema>>;
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
        id: mediaConfig.mediaId,
        media: selectMediaSubquery(mediaConfig.mediaId, "square"),
        filename: mediaTable.filename,
        sourceType: mediaTable.sourceType,
        sourceSize: mediaTable.sourceSize,
        sourceWidth: mediaTable.sourceWidth,
        sourceHeight: mediaTable.sourceHeight,
        originalUrl: sql<string | null>`
          case
            when ${mediaTable.kind} in ('svg', 'file') then ${mediaTable.sourceUrl}
            else ${mediaTable.variants}->'original'->>'url'
          end
        `,
        title: mediaTable.title,
        caption: mediaTable.caption,
      })
      .from(mediaConfig.table)
      .innerJoin(mediaTable, eq(mediaConfig.mediaId, mediaTable.id))
      .where(eq(mediaConfig.tableId, tableId))
      .orderBy(asc(mediaConfig.sortOrder));

    values[key] = rows
      .filter((row) => row.media)
      .map((row) => ({
        id: row.id,
        ...row.media,
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
        mediaId: mediaConfig.mediaId,
        alt: mediaTable.alt,
        title: mediaTable.title,
        caption: mediaTable.caption,
      })
      .from(mediaConfig.table)
      .innerJoin(mediaTable, eq(mediaConfig.mediaId, mediaTable.id))
      .where(eq(mediaConfig.tableId, tableId))
      .orderBy(asc(mediaConfig.sortOrder));

    const oldMediaIds = oldRows
      .map((row) => row.mediaId)
      .filter((mediaId): mediaId is number => typeof mediaId === "number");
    const mediaIds: number[] = [];
    const metadataByMediaId = new Map<
      number,
      { alt?: string | null; title?: string | null; caption?: string | null }
    >();

    for (const item of selected) {
      if ("action" in item && item.action === "upload") {
        const [media] = await db
          .select({ id: mediaTable.id })
          .from(mediaTable)
          .where(
            and(
              eq(mediaTable.publicId, item.mediaId),
              eq(mediaTable.createdBy, user.id),
            ),
          )
          .limit(1);

        if (media) {
          mediaIds.push(media.id);
          metadataByMediaId.set(media.id, imageMetadata(item));
        }
      } else if (typeof item.id === "number") {
        mediaIds.push(item.id);
        metadataByMediaId.set(item.id, imageMetadata(item));
      }
    }

    const addedMediaIds = mediaIds.filter(
      (mediaId) => !oldMediaIds.includes(mediaId),
    );
    const removedMediaIds = oldMediaIds.filter(
      (mediaId) => !mediaIds.includes(mediaId),
    );
    const movedMediaIds = mediaIds.filter((mediaId, index) => {
      return oldMediaIds.includes(mediaId) && oldMediaIds[index] !== mediaId;
    });
    const changedMetadata = [...metadataByMediaId.entries()].filter(
      ([mediaId, metadata]) => {
        const row = oldRows.find((oldRow) => oldRow.mediaId === mediaId);
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

    if (addedMediaIds.length) {
      await db.insert(mediaConfig.table).values(
        addedMediaIds.map((mediaId) => ({
          [mediaConfig.tableIdKey]: tableId,
          [mediaConfig.mediaIdKey]: mediaId,
          [mediaConfig.sortOrderKey]: mediaIds.indexOf(mediaId),
        })),
      );

      await db
        .update(mediaTable)
        .set({ status: "attached" })
        .where(inArray(mediaTable.id, addedMediaIds));
    }

    await Promise.all([
      ...movedMediaIds.map((mediaId) =>
        db
          .update(mediaConfig.table)
          .set({ [mediaConfig.sortOrderKey]: mediaIds.indexOf(mediaId) })
          .where(
            and(
              eq(mediaConfig.tableId, tableId),
              eq(mediaConfig.mediaId, mediaId),
            ),
          ),
      ),
      ...changedMetadata.map(([mediaId, metadata]) =>
        db.update(mediaTable).set(metadata).where(eq(mediaTable.id, mediaId)),
      ),
    ]);

    if (removedMediaIds.length) {
      await db
        .delete(mediaConfig.table)
        .where(
          and(
            eq(mediaConfig.tableId, tableId),
            inArray(mediaConfig.mediaId, removedMediaIds),
          ),
        );

      await db
        .update(mediaTable)
        .set({ status: "removed" })
        .where(inArray(mediaTable.id, removedMediaIds));
    }

    savedValues[key] = selected;
  }

  return savedValues;
}

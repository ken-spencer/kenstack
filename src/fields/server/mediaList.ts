import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type * as z from "zod";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import isEqual from "lodash-es/isEqual";

import { media as mediaTable, selectMediaSubquery } from "@kenstack/db/tables";
import type { User } from "@kenstack/types";
import { mediaListSchema } from "@kenstack/zod/mediaList";
import type { DefinedField, MediaListUploadOptions } from "../types";
import type {
  FieldLoadContext,
  FieldSaveContext,
  ServerFieldResolver,
} from ".";
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

  return (field) => ({
    upload: {
      accept: field.accept,
      maxSize: field.uploadMaxSize,
      maxSizeMessage: field.uploadMaxSizeMessage,
    },
    async load({ db, tableId }) {
      return loadMedia({
        db,
        tableId,
        media,
      });
    },
    async save({ db, tableId, value, user }) {
      return saveMedia({
        db,
        tableId,
        media,
        selected: value as z.output<typeof mediaListSchema>,
        user,
      });
    },
  });
}

async function loadMedia({
  db,
  tableId,
  media,
}: {
  db: FieldLoadContext["db"];
  tableId: number;
  media: MediaConfig;
}) {
  const rows = await db
    .select({
      id: media.mediaId,
      media: selectMediaSubquery(media.mediaId, "square"),
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
    .from(media.table)
    .innerJoin(mediaTable, eq(media.mediaId, mediaTable.id))
    .where(eq(media.tableId, tableId))
    .orderBy(asc(media.sortOrder));

  return rows
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

async function saveMedia({
  db,
  tableId,
  media,
  selected,
  user,
}: {
  db: FieldSaveContext["db"];
  tableId: number;
  media: MediaConfig;
  selected: z.output<typeof mediaListSchema>;
  user: User;
}) {
  const oldRows = await db
    .select({
      mediaId: media.mediaId,
      alt: mediaTable.alt,
      title: mediaTable.title,
      caption: mediaTable.caption,
    })
    .from(media.table)
    .innerJoin(mediaTable, eq(media.mediaId, mediaTable.id))
    .where(eq(media.tableId, tableId))
    .orderBy(asc(media.sortOrder));

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
    await db.insert(media.table).values(
      addedMediaIds.map((mediaId) => ({
        [media.tableIdKey]: tableId,
        [media.mediaIdKey]: mediaId,
        [media.sortOrderKey]: mediaIds.indexOf(mediaId),
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
        .update(media.table)
        .set({ [media.sortOrderKey]: mediaIds.indexOf(mediaId) })
        .where(and(eq(media.tableId, tableId), eq(media.mediaId, mediaId))),
    ),
    ...changedMetadata.map(([mediaId, metadata]) =>
      db.update(mediaTable).set(metadata).where(eq(mediaTable.id, mediaId)),
    ),
  ]);

  if (removedMediaIds.length) {
    await db
      .delete(media.table)
      .where(
        and(
          eq(media.tableId, tableId),
          inArray(media.mediaId, removedMediaIds),
        ),
      );

    await db
      .update(mediaTable)
      .set({ status: "removed" })
      .where(inArray(mediaTable.id, removedMediaIds));
  }

  return selected;
}

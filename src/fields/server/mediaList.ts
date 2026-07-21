import { and, asc, eq, inArray } from "drizzle-orm";
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
import { prepareMediaCrop } from "@kenstack/fields/records/mediaCrop";

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
  DefinedField<"media-list"> & MediaListUploadOptions,
  z.output<typeof mediaListSchema>
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
    async save({ admin = false, db, tableId, value, user }) {
      return saveMedia({
        admin,
        db,
        tableId,
        media,
        selected: value,
        user,
      });
    },
    async prepareSave({ admin, db, id, value, user }) {
      const selected = value;
      if (!selected.some((item) => item.squareCropChanged)) {
        return { status: "success" as const };
      }

      const currentRows = id
        ? await db
            .select({ mediaId: media.mediaId })
            .from(media.table)
            .where(eq(media.tableId, id))
        : [];
      const allowedMediaIds = new Set(
        currentRows
          .map((row) => row.mediaId)
          .filter((mediaId): mediaId is number => typeof mediaId === "number"),
      );
      if (admin) {
        selected.forEach((item) => {
          if (item.id !== undefined) {
            allowedMediaIds.add(item.id);
          }
        });
      }
      const next = [...selected];
      const afterSave = [];
      const afterCommit = [];
      const afterFailure = [];

      try {
        for (const [index, item] of selected.entries()) {
          const prepared = await prepareMediaCrop({
            allowedMediaIds,
            db,
            item,
            userId: user.id,
          });
          if (prepared) {
            next[index] = prepared.item;
            afterSave.push(prepared.afterSave);
            afterCommit.push(prepared.afterCommit);
            afterFailure.push(prepared.afterFailure);
          }
        }

        return {
          status: "success" as const,
          value: next,
          afterSave,
          afterCommit,
          afterFailure,
        };
      } catch (error) {
        await Promise.allSettled(afterFailure.map((message) => message()));
        throw error;
      }
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
    })
    .from(media.table)
    .innerJoin(mediaTable, eq(media.mediaId, mediaTable.id))
    .where(eq(media.tableId, tableId))
    .orderBy(asc(media.sortOrder));

  return rows
    .filter((row) => row.media)
    .map((row) => ({
      ...row.media,
      id: row.id,
    }));
}

async function saveMedia({
  admin,
  db,
  tableId,
  media,
  selected,
  user,
}: {
  admin: boolean;
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
  const savedMedia: z.output<typeof mediaListSchema> = [];
  const metadataByMediaId = new Map<
    number,
    { alt?: string | null; title?: string | null; caption?: string | null }
  >();

  for (const item of selected) {
    const savedItem = { ...item };
    delete savedItem.squareCropChanged;

    if ("action" in item && item.action === "upload") {
      const [mediaRow] = await db
        .select({
          id: mediaTable.id,
          alt: mediaTable.alt,
          title: mediaTable.title,
          caption: mediaTable.caption,
          status: mediaTable.status,
        })
        .from(mediaTable)
        .where(
          and(
            eq(mediaTable.publicId, item.mediaId),
            eq(mediaTable.createdBy, user.id),
          ),
        )
        .limit(1);

      if (
        mediaRow &&
        (mediaRow.status === "uploaded" || oldMediaIds.includes(mediaRow.id))
      ) {
        mediaIds.push(mediaRow.id);
        savedMedia.push(
          admin ? savedItem : { ...savedItem, ...imageMetadata(mediaRow) },
        );
        if (admin) {
          metadataByMediaId.set(mediaRow.id, imageMetadata(item));
        }
      }
    } else if (
      item.id !== undefined &&
      (admin || oldMediaIds.includes(item.id))
    ) {
      mediaIds.push(item.id);
      const oldRow = oldRows.find((row) => row.mediaId === item.id);
      savedMedia.push(
        !admin && oldRow
          ? { ...savedItem, ...imageMetadata(oldRow) }
          : savedItem,
      );
      if (admin) {
        metadataByMediaId.set(item.id, imageMetadata(item));
      }
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

  return savedMedia;
}

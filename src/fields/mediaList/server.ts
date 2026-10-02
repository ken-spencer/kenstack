import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import type * as z from "zod";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import isEqual from "lodash-es/isEqual";

import { selectMediaSubquery } from "@kenstack/db/queries/media";
import { media as mediaTable } from "@kenstack/db/tables";
import type { User } from "@kenstack/types";
import { mediaListField as createMediaListField, mediaListSchema } from ".";
import type { FieldLoadContext, FieldSaveContext } from "../serverField";
import { serverField, type ServerFieldResolverFor } from "../serverField";
import { imageMetadata } from "../internal/media/attachment";
import { prepareMediaCrop } from "../internal/media/crop";

type MediaHandlerConfig = {
  table: AnyPgTable & {
    tableId: AnyPgColumn<{ data: number }>;
    mediaId: AnyPgColumn<{ data: number }>;
    sortOrder: AnyPgColumn<{ data: number }>;
  };
};

export function mediaListField({
  table,
}: MediaHandlerConfig): ServerFieldResolverFor<
  ReturnType<typeof createMediaListField>
> {
  return serverField(createMediaListField(), (field) => ({
    upload: {
      accept: field.accept,
      maxSize: field.uploadMaxSize,
      maxSizeMessage: field.uploadMaxSizeMessage,
    },
    async load({ db, tableId }) {
      return loadMedia({
        db,
        tableId,
        table,
      });
    },
    async save({ admin = false, db, tableId, value, user }) {
      return saveMedia({
        admin,
        db,
        tableId,
        table,
        selected: value,
        user,
      });
    },
    async prepareSave({ admin, db, id, value, user }) {
      if (
        !value.some(
          (item) =>
            "squareCropChanged" in item && item.squareCropChanged === true,
        )
      ) {
        return { status: "success" as const };
      }

      const allowedMediaIds = new Set<number>();
      if (id) {
        const currentRows = await db
          .select({ mediaId: table.mediaId })
          .from(table)
          .where(eq(table.tableId, id));

        for (const { mediaId } of currentRows) {
          if (typeof mediaId === "number") {
            allowedMediaIds.add(mediaId);
          }
        }
      }
      if (admin) {
        value.forEach((item) => {
          if (item.id !== undefined) {
            allowedMediaIds.add(item.id);
          }
        });
      }
      const next = [...value];
      const afterSave = [];
      const afterCommit = [];
      const afterFailure = [];

      try {
        for (const [index, item] of value.entries()) {
          if (!("squareCropChanged" in item)) {
            continue;
          }

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
  }));
}

async function loadMedia({
  db,
  tableId,
  table,
}: {
  db: FieldLoadContext["db"];
  tableId: number;
  table: MediaHandlerConfig["table"];
}) {
  const rows = await db
    .select({
      id: table.mediaId,
      media: selectMediaSubquery(table.mediaId, "square"),
    })
    .from(table)
    .innerJoin(mediaTable, eq(table.mediaId, mediaTable.id))
    .where(eq(table.tableId, tableId))
    .orderBy(asc(table.sortOrder));

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
  table,
  selected,
  user,
}: {
  admin: boolean;
  db: FieldSaveContext["db"];
  tableId: number;
  table: MediaHandlerConfig["table"];
  selected: z.output<typeof mediaListSchema>;
  user: User;
}) {
  const oldRows = await db
    .select({
      mediaId: table.mediaId,
      alt: mediaTable.alt,
      title: mediaTable.title,
      caption: mediaTable.caption,
    })
    .from(table)
    .innerJoin(mediaTable, eq(table.mediaId, mediaTable.id))
    .where(eq(table.tableId, tableId))
    .orderBy(asc(table.sortOrder));

  const oldMediaIds = oldRows
    .map((row) => row.mediaId)
    .filter((mediaId) => typeof mediaId === "number");
  const mediaIds: number[] = [];
  const savedMedia: z.output<typeof mediaListSchema> = [];
  const metadataByMediaId = new Map<number, ReturnType<typeof imageMetadata>>();

  for (const item of selected) {
    const savedItem = { ...item };
    if ("squareCropChanged" in savedItem) {
      delete savedItem.squareCropChanged;
    }

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
          metadataByMediaId.set(
            mediaRow.id,
            imageMetadata("alt" in item ? item : {}),
          );
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
        metadataByMediaId.set(
          item.id,
          imageMetadata("alt" in item ? item : {}),
        );
      }
    }
  }

  const addedMediaIds = mediaIds.filter(
    (mediaId) => !oldMediaIds.includes(mediaId),
  );
  const removedMediaIds = oldMediaIds.filter(
    (mediaId) => !mediaIds.includes(mediaId),
  );
  const movedMediaIds = mediaIds.filter(
    (mediaId, index) =>
      oldMediaIds.includes(mediaId) && oldMediaIds[index] !== mediaId,
  );
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
    await db.insert(table).values(
      addedMediaIds.map((mediaId) => ({
        tableId,
        mediaId,
        sortOrder: mediaIds.indexOf(mediaId),
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
        .update(table)
        .set({ sortOrder: mediaIds.indexOf(mediaId) })
        .where(and(eq(table.tableId, tableId), eq(table.mediaId, mediaId))),
    ),
    ...changedMetadata.map(([mediaId, metadata]) =>
      db.update(mediaTable).set(metadata).where(eq(mediaTable.id, mediaId)),
    ),
  ]);

  if (removedMediaIds.length) {
    await db
      .delete(table)
      .where(
        and(
          eq(table.tableId, tableId),
          inArray(table.mediaId, removedMediaIds),
        ),
      );

    await db
      .update(mediaTable)
      .set({ status: "removed" })
      .where(inArray(mediaTable.id, removedMediaIds));
  }

  return savedMedia;
}

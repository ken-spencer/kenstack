import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, sql } from "drizzle-orm";
import isEqual from "lodash-es/isEqual";

import { ReturnedError } from "@kenstack/api/errors";
import { media } from "@kenstack/db/tables/media";
import type {
  ImageVariants,
  SquareCrop,
} from "@kenstack/db/tables/media/types";
import type {
  FieldAfterSave,
  FieldPrepareSaveContext,
} from "@kenstack/fields/server";
import { mediaStorage } from "@kenstack/lib/mediaStorage";
import {
  getSquareCropExtract,
  normalizeSquareCrop,
  squareImageSize,
} from "@kenstack/forms/SquareCrop/geometry";
import unsecureId from "@kenstack/lib/unsecureId";
import { queueMediaObjectCleanup } from "./mediaObjectCleanup";

type CropItem = {
  action?: string;
  id?: number;
  imageId?: string;
  mediaId?: string;
  squareCrop?: SquareCrop | null;
  squareCropChanged?: true;
};

export async function prepareMediaCrop<TItem extends CropItem>({
  allowedMediaIds,
  db,
  item,
  userId,
}: {
  allowedMediaIds: Set<number>;
  db: FieldPrepareSaveContext["db"];
  item: TItem;
  userId: number;
}) {
  if (!item.squareCropChanged) {
    return null;
  }

  const publicId = item.imageId ?? item.mediaId;
  const where =
    item.action === "upload" && publicId
      ? eq(media.publicId, publicId)
      : item.id !== undefined
        ? eq(media.id, item.id)
        : null;

  if (!where) {
    return null;
  }

  const [row] = await db
    .select({
      id: media.id,
      baseName: media.baseName,
      createdBy: media.createdBy,
      kind: media.kind,
      prefix: media.prefix,
      status: media.status,
      variants: media.variants,
    })
    .from(media)
    .where(where)
    .limit(1);

  if (!row || row.kind !== "raster" || !row.variants) {
    return null;
  }

  const ownsPendingAttachment =
    row.status === "uploaded" && row.createdBy === userId;
  if (!allowedMediaIds.has(row.id) && !ownsPendingAttachment) {
    throw new ReturnedError("You cannot adjust the crop for this image.");
  }

  const { original, square } = row.variants;
  const nextCrop = item.squareCrop
    ? normalizeSquareCrop(item.squareCrop, original.width, original.height)
    : null;
  const currentCrop = row.variants.squareCrop
    ? normalizeSquareCrop(
        row.variants.squareCrop,
        original.width,
        original.height,
      )
    : null;

  if (isEqual(nextCrop, currentCrop)) {
    return null;
  }

  const storage = mediaStorage;
  if (!storage) {
    throw new Error("Image processing is not configured.");
  }

  const originalObject = await storage.client.send(
    new GetObjectCommand({ Bucket: storage.bucket, Key: original.key }),
  );
  if (!originalObject.Body) {
    throw new Error("Could not read the image for cropping.");
  }

  const source = await originalObject.Body.transformToByteArray();
  const { default: sharp } = await import("sharp");
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine image dimensions.");
  }

  const extract = getSquareCropExtract(
    nextCrop,
    metadata.width,
    metadata.height,
  );
  const body = await sharp(source)
    .extract(extract)
    .resize({
      width: squareImageSize,
      height: squareImageSize,
      fit: "fill",
    })
    .webp({ lossless: true })
    .toBuffer();

  const key = `${row.prefix}/square/${row.baseName}-${unsecureId()}.webp`;
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp",
    }),
  );

  const nextVariants: ImageVariants = {
    ...row.variants,
    squareCrop: nextCrop,
    square: {
      key,
      url: storage.publicUrl(key),
      type: "image/webp",
      size: body.length,
      width: squareImageSize,
      height: squareImageSize,
      square: true,
    },
  };
  const afterSave: FieldAfterSave = async (tx) => {
    const [updated] = await tx
      .update(media)
      .set({ variants: nextVariants })
      .where(
        and(
          eq(media.id, row.id),
          sql`${media.variants}->'square'->>'key' = ${square.key}`,
        ),
      )
      .returning({ id: media.id });

    if (!updated) {
      throw new ReturnedError(
        "This image crop changed in another session. Reload and try again.",
      );
    }
  };
  const nextItem = {
    ...item,
    url: nextVariants.square.url,
    width: nextVariants.square.width,
    height: nextVariants.square.height,
    squareCrop: nextCrop,
  };
  delete nextItem.squareCropChanged;

  return {
    item: nextItem,
    afterSave,
    afterCommit: () =>
      queueMediaObjectCleanup({
        key: square.key,
        mediaId: row.id,
        reason: "superseded_variant",
      }),
    afterFailure: () =>
      queueMediaObjectCleanup({
        key,
        mediaId: row.id,
        reason: "staged_variant",
      }),
  };
}

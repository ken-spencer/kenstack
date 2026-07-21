import type { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ResizeOptions, WebpOptions } from "sharp";
import { deps } from "@app/deps";
import { media } from "@kenstack/db/tables";
import {
  imageMimeTypes,
  rasterMimeTypes,
} from "@kenstack/db/tables/media/mimeTypes";
import { squareImageSize } from "@kenstack/forms/SquareCrop/geometry";
import { formatFileSize } from "@kenstack/lib/fileSize";
import { mediaStorage } from "@kenstack/lib/mediaStorage";
import unsecureId from "@kenstack/lib/unsecureId";
import type { ServerDefinedFields } from "@kenstack/fields/server";
import { and, eq, getTableName } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import kebabCase from "lodash-es/kebabCase";
import path from "node:path";
import * as z from "zod";

const maxOriginalWidth = 1920;
const maxOriginalHeight = 1920;
const svgMimeType = "image/svg+xml";
const supportedImageMimeTypes: readonly string[] = imageMimeTypes;
const supportedRasterMimeTypes: readonly string[] = rasterMimeTypes;

export const mediaUploadRequestSchema = z.object({
  fieldname: z.string("field name is required"),
  filename: z
    .string("filename is required")
    .nonempty("filename cannot be empty"),
  type: z.string("file type is required").min(1, "file type is required"),
  size: z.number("size is required").gt(0, "size must be greater than 0"),
});

export const mediaUploadCompleteSchema = z.object({
  fieldname: z.string("field name is required").min(1),
  imageId: z.string("media id is required").min(1),
});

export async function createMediaUpload({
  fields,
  fieldname,
  filename,
  size,
  table,
  type,
  userId,
}: {
  fields: ServerDefinedFields;
  fieldname: string;
  filename: string;
  size: number;
  table: AnyPgTable;
  type: string;
  userId: number;
}) {
  const storage = mediaStorage;

  if (!storage?.uploadsConfigured) {
    return mediaUploadError("Uploads are not configured.");
  }

  const field = fields[fieldname];
  if (!field) {
    return mediaUploadError(`Unknown field name ${fieldname}`);
  }

  const uploadConfig = getUploadConfig(field);
  if (!uploadConfig) {
    return mediaUploadError(`Field "${fieldname}" does not support uploads.`);
  }

  if (!uploadConfig.accept.includes(type)) {
    return mediaUploadError("File type is not supported.");
  }

  if (size > uploadConfig.maxSize) {
    return mediaUploadError(uploadConfig.maxSizeMessage);
  }

  const kind = getMediaKind(type);
  const parsed = path.parse(filename);
  const baseName =
    kebabCase(parsed.name) || (kind === "file" ? "file" : "image");
  const ext = parsed.ext.toLowerCase();
  const imageId = unsecureId();
  const prefix = `${getTableName(table)}/${fieldname}/${imageId}`;
  const key = `${kind === "raster" ? "private/" : ""}${prefix}/${
    kind === "file" ? baseName : "original-" + baseName
  }${ext}`;

  const uploadUrl = await getSignedUrl(
    storage.client,
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ContentType: type,
    }),
    { expiresIn: 60 },
  );

  const publicUrl = storage.publicUrl(key);

  const [image] = await deps.db
    .insert(media)
    .values({
      createdBy: userId,
      status: "pending",
      kind,
      filename,
      prefix,
      baseName,
      sourceKey: key,
      sourceUrl: publicUrl,
      sourceType: type,
    })
    .returning({ id: media.publicId });

  return mediaUploadSuccess({ uploadUrl, id: image.id });
}

export async function completeMediaUpload({
  fields,
  fieldname,
  imageId,
  table,
  userId,
}: {
  fields: ServerDefinedFields;
  fieldname: string;
  imageId: string;
  table: AnyPgTable;
  userId: number;
}) {
  const storage = mediaStorage;

  if (!storage?.uploadsConfigured) {
    return mediaUploadError("Uploads are not configured.");
  }

  const field = fields[fieldname];
  if (!field) {
    return mediaUploadError(`Unknown field name ${fieldname}`);
  }

  const uploadConfig = getUploadConfig(field);
  if (!uploadConfig) {
    return mediaUploadError(`Field "${fieldname}" does not support uploads.`);
  }

  const [pendingImage] = await deps.db
    .select({
      id: media.id,
      key: media.sourceKey,
      prefix: media.prefix,
      baseName: media.baseName,
      filename: media.filename,
      kind: media.kind,
      type: media.sourceType,
    })
    .from(media)
    .where(
      and(
        eq(media.publicId, imageId),
        eq(media.status, "pending"),
        eq(media.createdBy, userId),
      ),
    );

  if (!pendingImage) {
    return mediaUploadError("Problem finding uploaded file. Please try again.");
  }

  if (!uploadConfig.accept.includes(pendingImage.type)) {
    await removePendingImage(
      storage,
      pendingImage.key,
      pendingImage.id,
      userId,
    );
    return mediaUploadError("File type is not supported.");
  }

  const { id, key, kind, type, baseName, prefix, filename } = pendingImage;

  const originalObject = await storage.client.send(
    new GetObjectCommand({
      Bucket: storage.bucket,
      Key: key,
    }),
  );

  if (!originalObject.Body) {
    return mediaUploadError("Could not read uploaded file from S3");
  }

  const originalStream = originalObject.Body as Readable;

  if (
    typeof originalObject.ContentLength === "number" &&
    originalObject.ContentLength > uploadConfig.maxSize
  ) {
    originalStream.destroy();
    await removePendingImage(storage, key, id, userId);
    return mediaUploadError(uploadConfig.maxSizeMessage);
  }

  if (kind === "file") {
    let sourceSize: number;
    if (typeof originalObject.ContentLength === "number") {
      sourceSize = originalObject.ContentLength;
      originalStream.destroy();
    } else {
      const originalBuffer = await buffer(originalStream);
      if (originalBuffer.length > uploadConfig.maxSize) {
        await removePendingImage(storage, key, id, userId);
        return mediaUploadError(uploadConfig.maxSizeMessage);
      }

      sourceSize = originalBuffer.length;
    }

    const [file] = await deps.db
      .update(media)
      .set({
        status: "uploaded",
        kind: "file",
        table: getTableName(table),
        sourceSize,
        sourceWidth: null,
        sourceHeight: null,
        variants: null,
      })
      .where(eq(media.id, id))
      .returning({
        imageId: media.publicId,
        url: media.sourceUrl,
        sourceType: media.sourceType,
        sourceSize: media.sourceSize,
      });

    return mediaUploadSuccess({
      ...file,
      kind: "file",
      mediaId: file.imageId,
      filename,
      width: null,
      height: null,
      originalUrl: file.url,
      sourceWidth: null,
      sourceHeight: null,
    });
  }

  const { default: sharp } = await import("sharp");
  const originalBuffer = await buffer(originalStream);

  if (originalBuffer.length > uploadConfig.maxSize) {
    await removePendingImage(storage, key, id, userId);
    return mediaUploadError(uploadConfig.maxSizeMessage);
  }

  const metadata = await sharp(originalBuffer).metadata();

  if (!metadata.format) {
    return mediaUploadError("Uploaded file is not a supported image");
  }

  if (type === svgMimeType) {
    const sanitizedSvg = await sanitizeSvg(originalBuffer);

    await storage.client.send(
      new PutObjectCommand({
        Bucket: storage.bucket,
        Key: key,
        Body: sanitizedSvg,
        ContentType: type,
      }),
    );

    const [image] = await deps.db
      .update(media)
      .set({
        status: "uploaded",
        kind: "svg",
        table: getTableName(table),
        sourceSize: sanitizedSvg.length,
        sourceWidth: metadata.width ?? null,
        sourceHeight: metadata.height ?? null,
      })
      .where(eq(media.id, id))
      .returning({
        imageId: media.publicId,
        url: media.sourceUrl,
        width: media.sourceWidth,
        height: media.sourceHeight,
        sourceType: media.sourceType,
        sourceSize: media.sourceSize,
      });

    return mediaUploadSuccess({
      ...image,
      kind: "svg",
      mediaId: image.imageId,
      filename,
      originalUrl: image.url,
      sourceWidth: image.width,
      sourceHeight: image.height,
    });
  }

  const originalWebpKey = `${prefix}/original/${baseName}.webp`;
  const squareWebpKey = `${prefix}/square/${baseName}.webp`;

  if (!metadata.width || !metadata.height) {
    return mediaUploadError("Could not determine uploaded image dimensions");
  }

  const webp =
    metadata.format === "png" ||
    metadata.format === "gif" ||
    metadata.format === "webp"
      ? { lossless: true }
      : { quality: 82 };

  const originalWebp = await createWebpVariant({
    key: originalWebpKey,
    missingDimensionsMessage: "Could not determine original variant dimensions",
    resize: {
      width: maxOriginalWidth,
      height: maxOriginalHeight,
      fit: "inside",
      withoutEnlargement: true,
    },
    storage,
    source: originalBuffer,
    webp,
  });
  if (originalWebp.status === "error") {
    return originalWebp;
  }

  const squareWebp = await createWebpVariant({
    key: squareWebpKey,
    missingDimensionsMessage: "Could not determine square variant dimensions",
    resize: {
      width: squareImageSize,
      height: squareImageSize,
      fit: "cover",
      position: "centre",
    },
    storage,
    source: originalBuffer,
    webp,
  });
  if (squareWebp.status === "error") {
    return squareWebp;
  }

  const [image] = await deps.db
    .update(media)
    .set({
      status: "uploaded",
      kind: "raster",
      table: getTableName(table),
      sourceSize: originalBuffer.length,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      variants: {
        original: originalWebp.variant,
        square: {
          ...squareWebp.variant,
          square: true,
        },
      },
    })
    .where(eq(media.id, id))
    .returning({ imageId: media.publicId, variants: media.variants });

  if (!image.variants) {
    throw Error("No variants on image");
  }

  const {
    variants: { square },
  } = image;

  return mediaUploadSuccess({
    imageId: image.imageId,
    kind: "raster",
    mediaId: image.imageId,
    url: square.url,
    width: square.width,
    height: square.height,
    filename,
    sourceType: type,
    sourceSize: originalBuffer.length,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    originalUrl: originalWebp.variant.url,
    original: {
      url: originalWebp.variant.url,
      width: originalWebp.variant.width,
      height: originalWebp.variant.height,
    },
    squareCrop: null,
  });
}

function mediaUploadError(message: string) {
  return { status: "error" as const, message };
}

function mediaUploadSuccess<T extends Record<string, unknown>>(payload: T) {
  return { status: "success" as const, payload };
}

function getUploadConfig(field: ServerDefinedFields[string]) {
  const { upload } = field;
  if (!upload) {
    return;
  }

  const accept =
    upload === true || !upload.accept?.length
      ? supportedRasterMimeTypes
      : upload.accept;
  const maxSize =
    upload === true
      ? deps.uploadMaxImageSize
      : (upload.maxSize ?? deps.uploadMaxImageSize);
  const maxSizeMessage =
    upload === true
      ? deps.uploadMaxImageSizeMessage
      : (upload.maxSizeMessage ?? getDefaultMaxSizeMessage(accept, maxSize));

  return {
    accept,
    maxSize,
    maxSizeMessage,
  };
}

function getDefaultMaxSizeMessage(accept: readonly string[], maxSize: number) {
  const allImages = accept.every((type) =>
    supportedImageMimeTypes.includes(type),
  );

  return allImages
    ? deps.uploadMaxImageSizeMessage
    : `Maximum file size is ${formatFileSize(maxSize, { unitStyle: "long" })}.`;
}

function getMediaKind(type: string) {
  if (type === svgMimeType) {
    return "svg";
  }

  if (supportedRasterMimeTypes.includes(type)) {
    return "raster";
  }

  return "file";
}

async function sanitizeSvg(buffer: Buffer) {
  const { default: DOMPurify } = await import("isomorphic-dompurify");
  const { optimize } = await import("svgo");
  const svg = buffer.toString("utf8");
  const sanitized = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  const result = optimize(sanitized, {
    multipass: true,
    plugins: ["removeDimensions"],
  });

  if ("data" in result) {
    return Buffer.from(result.data, "utf8");
  }

  throw new Error("Could not sanitize SVG");
}

async function createWebpVariant({
  key,
  missingDimensionsMessage,
  resize,
  storage,
  source,
  webp,
}: {
  key: string;
  missingDimensionsMessage: string;
  resize: ResizeOptions;
  storage: NonNullable<typeof mediaStorage>;
  source: Buffer;
  webp: WebpOptions;
}) {
  const { default: sharp } = await import("sharp");
  const body = await sharp(source)
    .rotate()
    .resize(resize)
    .webp(webp)
    .toBuffer();

  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp",
    }),
  );

  const metadata = await sharp(body).metadata();
  if (!metadata.width || !metadata.height) {
    return mediaUploadError(missingDimensionsMessage);
  }

  return {
    status: "success" as const,
    variant: {
      key,
      url: storage.publicUrl(key),
      type: "image/webp" as const,
      size: body.length,
      width: metadata.width,
      height: metadata.height,
    },
  };
}

async function removePendingImage(
  storage: NonNullable<typeof mediaStorage>,
  key: string,
  id: number,
  userId: number,
) {
  await storage.client.send(
    new DeleteObjectCommand({
      Bucket: storage.bucket,
      Key: key,
    }),
  );

  await deps.db
    .delete(media)
    .where(and(eq(media.id, id), eq(media.createdBy, userId)));
}

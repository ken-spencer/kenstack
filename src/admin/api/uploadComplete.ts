import type { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { media } from "@kenstack/db/tables/media";
import { deps } from "@app/deps";
import canUpload from "@kenstack/lib/canUpload";
import { and, eq, getTableName } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";

import { pipelineStage } from "@kenstack/api";

import * as z from "zod";
import type { ServerDefinedFields } from "@kenstack/fields/server";
// import { imageMimeTypes } from "@kenstack/zod/image";

const region = process.env.AWS_S3_REGION ?? process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

const maxOriginalWidth = 1920;
const maxOriginalHeight = 1920;
const squareSize = 800;

const sanitizeSvg = async (buffer: Buffer): Promise<Buffer> => {
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
};

const uploadSchema = z.object({
  fieldname: z.string("image field name is required").min(1),
  imageId: z.string("image id is required").min(1),
});

const s3 = new S3Client({
  requestChecksumCalculation: "WHEN_REQUIRED",
  region,
}); // region & creds auto-loaded from AWS_* env vars

type ImageUploadConfig = {
  table: AnyPgTable;
  fields: ServerDefinedFields;
};

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const getWebpOptions = (format?: string) => {
  const lossless = format === "png" || format === "gif" || format === "webp";

  return lossless
    ? { lossless: true }
    : {
        quality: 82,
      };
};

const uploadWebpVariant = async ({
  body,
  key,
}: {
  body: Buffer;
  key: string;
}) => {
  if (!bucket) {
    throw new Error("Missing AWS_S3_BUCKET");
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp",
    }),
  );
};

const removeUploadedObject = async (key: string) => {
  if (!bucket) {
    throw new Error("Missing AWS_S3_BUCKET");
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
};

export const uploadCompleteAction = (adminConfig: ImageUploadConfig) =>
  pipelineStage({ schema: uploadSchema }, async ({ data, response }) => {
    if (!canUpload()) {
      return response.error("Image uploads are not configured.");
    }

    const { fieldname } = data;
    const user = await deps.auth.requireUser();

    const [pendingImage] = await deps.db
      .select({
        id: media.id,
        key: media.sourceKey,
        prefix: media.prefix,
        baseName: media.baseName,
        filename: media.filename,
        type: media.sourceType,
      })
      .from(media)
      .where(
        and(
          eq(media.publicId, data.imageId),
          eq(media.status, "pending"),
          eq(media.createdBy, user.id),
        ),
      );

    if (!pendingImage) {
      return response.error(
        "Problem finding uploaded image. Please try again.",
      );
    }
    const { id, key, type, baseName, prefix, filename } = pendingImage;

    const field = adminConfig.fields[fieldname];
    if (!field) {
      return response.error(`Unknown field name ${fieldname}`);
    }

    if (!field.behavior?.upload) {
      return response.error(`Field "${fieldname}" does not support uploads.`);
    }

    if (!bucket) {
      return response.error("Missing AWS_S3_BUCKET");
    }

    // const sourceUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    const { default: sharp } = await import("sharp");

    const originalObject = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!originalObject.Body) {
      return response.error("Could not read uploaded image from S3");
    }

    if (
      typeof originalObject.ContentLength === "number" &&
      originalObject.ContentLength > deps.uploadMaxImageSize
    ) {
      await removeUploadedObject(key);
      await deps.db
        .delete(media)
        .where(and(eq(media.id, id), eq(media.createdBy, user.id)));
      return response.error(deps.uploadMaxImageSizeMessage);
    }

    const originalBuffer = await streamToBuffer(
      originalObject.Body as Readable,
    );

    if (originalBuffer.length > deps.uploadMaxImageSize) {
      await removeUploadedObject(key);
      await deps.db
        .delete(media)
        .where(and(eq(media.id, id), eq(media.createdBy, user.id)));
      return response.error(deps.uploadMaxImageSizeMessage);
    }

    const metadata = await sharp(originalBuffer).metadata();

    if (!metadata.format) {
      return response.error("Uploaded file is not a supported image");
    }

    if (type === "image/svg+xml") {
      const sanitizedSvg = await sanitizeSvg(originalBuffer);

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
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
          table: getTableName(adminConfig.table),
          // sourceUrl,
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

      return response.success({
        ...image,
        filename,
        originalUrl: image.url,
        sourceWidth: image.width,
        sourceHeight: image.height,
      });
    }

    const webpOptions = getWebpOptions(metadata.format);

    const originalWebpKey = `${prefix}/original/${baseName}.webp`;
    const squareWebpKey = `${prefix}/square/${baseName}.webp`;

    const originalWebp = await sharp(originalBuffer)
      .rotate()
      .resize({
        width: maxOriginalWidth,
        height: maxOriginalHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp(webpOptions)
      .toBuffer();

    const squareWebp = await sharp(originalBuffer)
      .rotate()
      .resize({
        width: squareSize,
        height: squareSize,
        fit: "cover",
        position: "centre",
        withoutEnlargement: true,
      })
      .webp(webpOptions)
      .toBuffer();

    await Promise.all([
      uploadWebpVariant({
        key: originalWebpKey,
        body: originalWebp,
      }),
      uploadWebpVariant({
        key: squareWebpKey,
        body: squareWebp,
      }),
    ]);

    const originalWebpUrl = `https://${bucket}.s3.${region}.amazonaws.com/${originalWebpKey}`;
    const squareWebpUrl = `https://${bucket}.s3.${region}.amazonaws.com/${squareWebpKey}`;

    const originalWebpMetadata = await sharp(originalWebp).metadata();
    const squareWebpMetadata = await sharp(squareWebp).metadata();

    if (!metadata.width || !metadata.height) {
      return response.error("Could not determine uploaded image dimensions");
    }

    if (!originalWebpMetadata.width || !originalWebpMetadata.height) {
      return response.error("Could not determine original variant dimensions");
    }

    if (!squareWebpMetadata.width || !squareWebpMetadata.height) {
      return response.error("Could not determine square variant dimensions");
    }

    const [image] = await deps.db
      .update(media)
      .set({
        status: "uploaded",
        kind: "raster",
        table: getTableName(adminConfig.table),

        // sourceUrl: sourceUrl,
        // sourceType: type,
        sourceSize: originalBuffer.length,
        sourceWidth: metadata.width,
        sourceHeight: metadata.height,

        variants: {
          original: {
            key: originalWebpKey,
            url: originalWebpUrl,
            type: "image/webp",
            size: originalWebp.length,
            width: originalWebpMetadata.width,
            height: originalWebpMetadata.height,
          },
          square: {
            key: squareWebpKey,
            url: squareWebpUrl,
            type: "image/webp",
            size: squareWebp.length,
            width: squareWebpMetadata.width,
            height: squareWebpMetadata.height,
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

    return response.success({
      imageId: image.imageId,
      url: square.url,
      width: square.width,
      height: square.height,
      filename,
      sourceType: type,
      sourceSize: originalBuffer.length,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      originalUrl: originalWebpUrl,
    });
  });

import type { AdminApiOptions, AnyAdminTable } from "..";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

import { pipeline, type PipelineAction } from "@kenstack/lib/api";

import * as z from "zod";
import { imageMimeTypes } from "@kenstack/zod/image";

const region = process.env.AWS_S3_REGION ?? process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

const maxOriginalWidth = 1920;
const maxOriginalHeight = 1920;
const squareSize = 800;

const uploadSchema = z.object({
  fieldname: z.string("image field name is required").min(1),
  prefix: z.string("prefix is required").min(1),
  key: z.string("key is required").min(1),
  baseName: z.string("baseName is required").min(1),
  filename: z
    .string("filename is required")
    .nonempty("filename cannot be empty"),
  type: z.enum(imageMimeTypes, "Image type is not supported"),
  size: z.number("size is required").gt(0, "size must be greater than 0"),
});

export const uploadCompletePipeline = ({
  adminTable,
  ...options
}: AdminApiOptions) => {
  return pipeline({ ...options }, [uploadCompleteAction(adminTable)]);
};

const s3 = new S3Client({
  requestChecksumCalculation: "WHEN_REQUIRED",
  region,
}); // region & creds auto-loaded from AWS_* env vars

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

const uploadCompleteAction =
  (adminTable: AnyAdminTable): PipelineAction<typeof uploadSchema> =>
  async ({ dataIn, response }) => {
    const parsedData = uploadSchema.safeParse(dataIn);
    if (!parsedData.success) {
      const firstIssue = parsedData.error.issues[0];
      return response.error(
        "There was a problem uploading the image: " + firstIssue.message,
      );
    }
    const { data } = parsedData;

    const { fieldname, key, baseName, prefix, filename, type, size } = data;

    const field = adminTable.fields[fieldname];
    if (!field) {
      return response.error(`Unknown field name ${fieldname}`);
    }
    if (!bucket) {
      return response.error("Missing AWS_S3_BUCKET");
    }

    const sourceUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    if (type === "image/svg+xml") {
      return response.success({
        kind: "svg",
        version: 1,
        filename,
        prefix,
        baseName,
        source: {
          key,
          url: sourceUrl,
          type,
          size,
        },
      });
    }

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

    const originalBuffer = await streamToBuffer(
      originalObject.Body as Readable,
    );
    const metadata = await sharp(originalBuffer).metadata();
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

    /**
     * TODO
     * Note that this approach would not be secure for avatars
     * build single images table similar to tags.
     * images uploaded here would be marked as pending and could be cleaned up later
     * on final save, link to table via intermediary blg_images, user_avatars etc.
     * that way image info is not saved with the record.
     * include uploader_id on the mages table, and only allow them to claim a pending upload
     * presigned url would go in a tmp folder for future cleanup.
     * This function would move from tmp to permanent location. (but cleaned up via pending)
     * would need to have an image kind for fields that would trigger joins in admin.
     * Thinking this might be ore like a ts type than a zod type as would not be transmitted in full moving forward
     * image field would not submit same data it receives, but only send commands.
     * something like {url, width, height, action} where only theaction is seen by server (+ related data)
     */

    return response.success({
      kind: "raster",
      version: 1,
      filename,
      prefix,
      baseName,
      source: {
        key,
        url: sourceUrl,
        type,
        size,
        width: metadata.width,
        height: metadata.height,
      },
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
    });
  };

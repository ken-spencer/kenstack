import type { AdminApiOptions, AnyAdminTable } from "..";
import type { Readable } from "node:stream";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { images } from "@kenstack/db/tables/images";
import { deps } from "@app/deps";
import { and, eq, getTableName } from "drizzle-orm";

import { pipeline, type PipelineAction } from "@kenstack/lib/api";

import * as z from "zod";
// import { imageMimeTypes } from "@kenstack/zod/image";

const region = process.env.AWS_S3_REGION ?? process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

const maxOriginalWidth = 1920;
const maxOriginalHeight = 1920;
const squareSize = 800;

const sanitizeSvg = async (buffer: Buffer): Promise<Buffer> => {
  const { optimize } = await import("svgo");
  const svg = buffer.toString("utf8");
  const result = optimize(svg, {
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
  // prefix: z.string("prefix is required").min(1),
  // key: z.string("key is required").min(1),
  // baseName: z.string("baseName is required").min(1),
  // filename: z
  //   .string("filename is required")
  //   .nonempty("filename cannot be empty"),
  // type: z.enum(imageMimeTypes, "Image type is not supported"),
  // size: z.number("size is required").gt(0, "size must be greater than 0"),
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

    const { fieldname /*key, baseName, prefix, filename, type, size*/ } = data;

    const [pendingImage] = await deps.db
      .select({
        id: images.id,
        key: images.sourceKey,
        prefix: images.prefix,
        baseName: images.baseName,
        type: images.sourceType,
      })
      .from(images)
      .where(
        and(eq(images.publicId, data.imageId), eq(images.status, "pending")),
      );

    if (!pendingImage) {
      return response.error(
        "Problem finding uploaded image. Please try again.",
      );
    }
    const { id, key, type, baseName, prefix } = pendingImage;

    const field = adminTable.fields[fieldname];
    if (!field) {
      return response.error(`Unknown field name ${fieldname}`);
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

    const originalBuffer = await streamToBuffer(
      originalObject.Body as Readable,
    );
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
        .update(images)
        .set({
          status: "uploaded",
          kind: "svg",
          table: getTableName(adminTable.table),
          // sourceUrl,
          sourceSize: sanitizedSvg.length,
          sourceWidth: metadata.width ?? null,
          sourceHeight: metadata.height ?? null,
        })
        .where(eq(images.id, id))
        .returning({
          imageId: images.publicId,
          url: images.sourceUrl,
          width: images.sourceWidth,
          height: images.sourceHeight,
        });

      return response.success({ ...image });
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
      .update(images)
      .set({
        status: "uploaded",
        kind: "raster",
        table: getTableName(adminTable.table),

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
      .where(eq(images.id, id))
      .returning({ imageId: images.publicId, variants: images.variants });

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
    });
  };

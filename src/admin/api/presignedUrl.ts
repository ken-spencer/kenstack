import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import kebabCase from "lodash-es/kebabCase";
import { getTableName } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import path from "node:path";
import unsecureId from "@kenstack/lib/unsecureId";
import { media } from "@kenstack/db/tables";
import { deps } from "@app/deps";
import canUpload from "@kenstack/lib/canUpload";
import type { ServerDefinedFields } from "@kenstack/fields/server";

import { pipelineStage } from "@kenstack/api";

import * as z from "zod";
import { rasterMimeTypes } from "@kenstack/db/tables/media/mimeTypes";

const region = process.env.AWS_S3_REGION ?? process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

const s3 = new S3Client({
  requestChecksumCalculation: "WHEN_REQUIRED",
  region,
}); // region & creds auto-loaded from AWS_* env vars

const uploadSchema = z.object({
  fieldname: z.string("image field name is required"),
  filename: z
    .string("filename is required")
    .nonempty("filename cannot be empty"),
  type: z.enum(rasterMimeTypes, "Image type is not supported"),
  size: z
    .number("size is required")
    .gt(0, "size must be greater than 0")
    .max(deps.uploadMaxImageSize, deps.uploadMaxImageSizeMessage),
});

const svgMimeType = "image/svg+xml";

type ImageUploadConfig = {
  table: AnyPgTable;
  fields: ServerDefinedFields;
};

export const getPresignedUrlAction = (adminConfig: ImageUploadConfig) =>
  pipelineStage(
    { role: "admin", schema: uploadSchema },
    async ({ data, response, user }) => {
      if (!canUpload()) {
        return response.error("Image uploads are not configured.");
      }

      const { fieldname, filename, type } = data;
      // Raster uploads are the current default. Keep the SVG-aware branches here
      // because this stage will later accept configurable MIME types per field.
      const uploadType: string = type;
      const isSvg = uploadType === svgMimeType;

      const field = adminConfig.fields[fieldname];
      if (!field) {
        return response.error(`Unknown field name ${fieldname}`);
      }

      if (!field.behavior?.upload) {
        return response.error(`Field "${fieldname}" does not support uploads.`);
      }

      const tablename = getTableName(adminConfig.table);
      const parsed = path.parse(filename);
      const baseName = kebabCase(parsed.name) || "image";
      const ext = parsed.ext.toLowerCase();
      const imageId = unsecureId();

      const prefix = `${tablename}/${fieldname}/${imageId}`;
      const key = `${isSvg ? "" : "private/"}${prefix}/original-${baseName}${ext}`;

      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: type,
      });

      const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // 1 min
      const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

      const [image] = await deps.db
        .insert(media)
        .values({
          createdBy: user.id,
          status: "pending",
          kind: isSvg ? "svg" : "raster",
          filename,
          prefix,
          baseName,
          sourceKey: key,
          sourceUrl: publicUrl,
          sourceType: type,
        })
        .returning({ id: media.publicId });

      return response.success({ uploadUrl, id: image.id });
    },
  );

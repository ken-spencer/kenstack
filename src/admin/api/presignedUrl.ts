import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AdminApiOptions, AnyAdminTable } from "..";
import kebabCase from "lodash-es/kebabCase";
import { getTableName } from "drizzle-orm";
import path from "node:path";
import unsecureId from "@kenstack/lib/unsecureId";

import { pipeline, type PipelineAction } from "@kenstack/lib/api";

import * as z from "zod";
import { imageMimeTypes } from "@kenstack/zod/image";

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
  type: z.enum(imageMimeTypes, "Image type is not supported"),
  size: z.number("size is required").gt(0, "size must be greater than 0"),
});

export const getPresignedUrlPipeline = ({
  adminTable,
  ...options
}: AdminApiOptions) => {
  return pipeline({ ...options }, [getPresignedUrl(adminTable)]);
};

const getPresignedUrl =
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

    const { fieldname, filename, type } = data;

    const field = adminTable.fields[fieldname];
    if (!field) {
      return response.error(`Unknown field name ${fieldname}`);
    }

    const tablename = getTableName(adminTable.table);
    const parsed = path.parse(filename);
    const baseName = kebabCase(parsed.name) || "image";
    const ext = parsed.ext.toLowerCase();
    const imageId = unsecureId();

    const prefix = `${tablename}/${fieldname}/${imageId}`;
    const key = `${prefix}/original-${baseName}${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: type,
    });

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // 1 min

    return response.success({ uploadUrl, key, prefix, baseName, publicUrl });
  };

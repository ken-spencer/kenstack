import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

const region =
  process.env.AWS_S3_REGION?.trim() || process.env.AWS_REGION?.trim();
const bucket = process.env.AWS_S3_BUCKET?.trim();
const hasCredentials = Boolean(
  process.env.AWS_ACCESS_KEY_ID?.trim() &&
  process.env.AWS_SECRET_ACCESS_KEY?.trim(),
);

export const mediaStorage =
  bucket && region
    ? {
        bucket,
        client: new S3Client({
          requestChecksumCalculation: "WHEN_REQUIRED",
          region,
        }),
        publicUrl: (key: string) =>
          `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
        uploadsConfigured: hasCredentials,
      }
    : null;

export const uploadsConfigured = Boolean(mediaStorage?.uploadsConfigured);

"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// import generateS3Key from "./generateS3Key";

// import { customAlphabet } from 'nanoid/non-secure'
// const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 15)
import { nanoid } from "nanoid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function presignedUrlAction({ filename, type }) {
  if (!process.env.AWS_S3_BUCKET) {
    return { error: "AWS_S3_BUCKET must be specified" };
  }

  // const {filename, prefix} = generateS3Key(name);
  // const Key = "incoming/" + prefix + "/" + "original/" + filename;
  const tmpName = nanoid();
  const Key = "incoming/" + tmpName;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key,
    ContentType: type,
    ACL: "private",
    // ACL: 'public-read', // This will make the file public
  };

  try {
    const command = new PutObjectCommand(params);
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });
    return { success: true, uploadUrl, filename, tmpName };
  } catch (e) {
    return {
      error:
        "There was an unexpected problem uploading your file. Please try again later: " +
        e.message,
    };
  }
}

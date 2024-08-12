"use server";

import Image from "../../db/Image";

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
// import { PassThrough } from "stream";
import Sharp from "sharp";
// import exifReader from "exif-reader";

import { customAlphabet } from "nanoid/non-secure";
const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 15);

// import { pipeline } from "stream";
// import { promisify } from "util";
// import { pipeline } from "stream/promises";

import acl from "@admin/auth/acl";

const s3 = new S3Client();
// const streamPipeline = promisify(pipeline);

async function getImage(key) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  };
  const command = new GetObjectCommand(params);
  const { Body } = await s3.send(command);
  return Body.transformToByteArray();
}

async function deleteImage(key) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  await s3.send(command);
}

async function uploadImage(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3.send(command);
}

const uploadCompleteAction = ({ tmpName, filename, folder }) =>
  acl("ADMIN", async () => {
    // const key = "rlnnkx46y30kmra/original/img-0062.jpg";

    // const tmpPath = "incoming/5lUFGUWYYQRk9RIDI04K2";
    const tmpPath = "incoming/" + tmpName;

    const prefix = nanoid();
    const imageDB = new Image({
      prefix,
      filename,
      folder,
    });

    let tmpImageBuffer;
    try {
      tmpImageBuffer = await getImage(tmpPath);
    } catch (e) {
      return { error: "There was a problem" };
    }

    const image = Sharp(tmpImageBuffer);
    const metadata = await image.metadata();

    let isLossless = false;
    if (metadata.format === "png" || metadata.format === "tiff") {
      isLossless = true;
    } else if (metadata.format === "webp" && metadata.lossless) {
      isLossless = true;
    }

    const imageConverted = await image.rotate().webp({ lossless: isLossless });

    const imageBuffer = await imageConverted.toBuffer();
    const imagePath = imageDB.setSize(
      "original",
      "webp",
      metadata.width,
      metadata.height,
    );

    await uploadImage(imagePath, imageBuffer, "image/webp");

    const thumbnailImage = await Sharp(tmpImageBuffer)
      .resize({
        width: 200,
        height: 200,
        // fit: "inside", // ensure image fits inside diemensions withot stretching
        withoutEnlargement: true, // don't upsize
      })
      .rotate()
      .webp({ lossless: isLossless });
    const thumbnailBuffer = await thumbnailImage.toBuffer();

    const thumbnailData = await Sharp(thumbnailBuffer).metadata();

    const thumbnailPath = imageDB.setSize(
      "libraryThumbnail",
      "webp",
      thumbnailData.width,
      thumbnailData.height,
    );

    /*
    await Promise.all([
      uploadImage(imagePath, imageBuffer, 'image/webp'),
      uploadImage(thumbnailPath, thumbnailBuffer, 'image/webp'),
    ]);
    */
    await uploadImage(thumbnailPath, thumbnailBuffer, "image/webp"),
      //  .toBuffer();

      await imageDB.save();

    await deleteImage(tmpPath);

    return { success: true };
  });

export default uploadCompleteAction;

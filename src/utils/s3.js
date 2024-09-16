import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client();

export async function getObject(key) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  };
  const command = new GetObjectCommand(params);
  const { Body } = await s3.send(command);
  return Body.transformToByteArray();
}

export async function deleteObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  await s3.send(command);
}

export async function putObject(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3.send(command);
}

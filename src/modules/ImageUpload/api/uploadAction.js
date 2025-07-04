import sharp from "sharp";

import { basename, extname } from "path";
import { customAlphabet } from "nanoid/non-secure";
const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 15);

import { deleteObject, putObject } from "@kenstack/utils/s3";

function getUploadBasename(filename) {
  const lowerName = filename.toLowerCase();

  let ext = extname(lowerName);
  let base = basename(lowerName, ext)
    .replace(/(\s|_)+/g, "-")
    .replace(/[^\w\-.]/g, "") // remove any non word characters
    .replace(/--{2,}/g, "-") // remove any double dashes
    .replace(/^\W+|\W+$/g, ""); // trim non word characters from beginning | end

  return base;
}

// TODO
// specify list if fields / options (maxWidth etc
// get config setting from above by submitted name
// make path prefix/name/filename

export default async function uploadACtion(
  formData,
  { document, prefix = nanoid() }
) {
  if (!document) {
    throw Error("Document is required for image upload");
  }

  if (document.images === undefined) {
    document.images = new Map();
  }

  if (!(document.images instanceof Map)) {
    throw Error("Document must have a map 'images'");
  }

  const name = formData.get("name");
  if (!name) {
    return { error: "Name is required." };
  }

  const file = formData.get("file");
  if (!file) {
    return { error: "No file was uploaded" };
  }

  // const arrayBuffer = await file.arrayBuffer();

  let buffer = Buffer.from(await file.arrayBuffer());
  const image = sharp(buffer);
  const metadata = await image.metadata();
  let resizedMetadata = metadata;

  const { /* width, height, */ format } = metadata;

  if (format !== "svg") {
    /*
    const isLossless =
      format === "png" ||
      format === "tiff" ||
      (format === "webp" && metadata.lossless)
    ;
    */

    // TODO, we are not going to want webp for emails, just ofr the site.
    let tmpImage = image;

    tmpImage = tmpImage.rotate();

    let wasResized = false;

    tmpImage = tmpImage.resize({
      width: 200,
      height: 200,
      fit: "inside", // ensure image fits inside diemensions withot stretching
      withoutEnlargement: true, // don't upsize
    });
    wasResized = true;

    // let's save original image for now.
    // tmpImage = tmpImage.webp({ lossless: isLossless });

    buffer = await tmpImage.toBuffer();

    if (wasResized) {
      const resizedKmage = sharp(buffer);
      resizedMetadata = await resizedKmage.metadata();
    }
  }

  const ext = format === "jpeg" ? "jpg" : format;
  const path =
    prefix + "/" + name + "/" + getUploadBasename(file.name) + "." + ext;
  const data = {
    filename: file.name,
    type: file.type,
    format,
    width: resizedMetadata.width,
    height: resizedMetadata.height,
    path,
  };

  const old = document.images.get(name);

  document.images.set(name, data);
  await putObject(path, buffer, file.type);
  await document.save();

  if (old && old.path !== path) {
    await deleteObject(old.path);
  }

  return { success: "Image was uploaded successfully", data };
}

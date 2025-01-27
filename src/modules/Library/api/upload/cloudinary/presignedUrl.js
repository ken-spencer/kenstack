"use server";

import { basename, extname } from "path";

import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY__API_SECRET,
  secure: true,
});

import { customAlphabet } from "nanoid/non-secure";
const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 15);

function normalizeFilename(filename) {
  let retval = basename(filename, extname(filename))
    .trim()
    .replace(/[\s\._]+/g, "-") // remove spaces
    .replace(/[^\w\-.]/g, "") // remove any non word characters
    // .replace(/^-+|-+$/g, "") // remove dash from beginning or end
    .replace(/^\W+|\W+$/g, "") // trim non word characters from beginning | end
    .replace(/--{2,}/g, "-") // remove any double dashes
    .toLowerCase();

  if (retval.length === 0) {
    return nanoid();
  }

  return retval;
}

export default async function presignedUrlAction({ filename, type }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "test/images/" + nanoid();

  const public_id = normalizeFilename(filename);

  // console.log(filename,  public_id);
  // return {error: "bah"};

  const eager = [
    "f_webp", // Original dimensions as WebP
    "w_200,h_200,c_thumb,g_center,f_webp", // Thumbnail as WebP
  ].join("|");

  const options = {
    timestamp,
    folder,
    public_id,
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    eager,
  };

  const signature = cloudinary.utils.api_sign_request(
    options,
    process.env.CLOUDINARY_API_SECRET,
  );

  return {
    success: true,
    uploadUrl: cloudinary.utils.api_url("upload"),
    fields: {
      ...options,
      api_key: process.env.CLOUDINARY_API_KEY,
      signature,
    },
  };
}

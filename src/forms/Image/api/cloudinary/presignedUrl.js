import unsecureId from "@kenstack/utils/unsecureId";
import normalizeFilename from "@kenstack/utils/normalizeFilename";

import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default async function presignedUrlAction({ filename, type }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.SITE_NAME + "/images/" + unsecureId();

  const public_id = normalizeFilename(filename);

  const eager =
    type === "image/svg+xml"
      ? undefined
      : [
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
    // tags: "provisional",
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

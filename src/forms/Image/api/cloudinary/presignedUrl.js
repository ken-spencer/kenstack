import unsecureId from "@kenstack/utils/unsecureId";
import normalizeFilename from "@kenstack/utils/normalizeFilename";

import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const acceptDefault = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
];

const presignedUrlAction =
  ({ accept = acceptDefault, folder: folderSegment = "/images" } = {}) =>
  async ({ model, filename, type, name, data }) => {
    // transitioning to api pipeline
    if (data) {
      ({ filename, type, name } = data);
    }

    if (!accept.includes(type)) {
      return Response.json({ error: `Invalid file type ${type}` });
    }

    let path;
    if (!name || !(path = model.schema.path(name))) {
      return Response.json({ error: `Unknown field ${name}` });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = process.env.SITE_NAME + folderSegment + "/" + unsecureId();

    const public_id = normalizeFilename(filename);

    const transformations = [];
    for (const t of path.options.transformations.values()) {
      transformations.push(t);
    }

    // [
    //   "f_webp", // Original dimensions as WebP
    //   "w_200,h_200,c_limit,f_webp", // original dimension thumbnail
    //   "w_200,h_200,c_thumb,g_center,f_webp", // Thumbnail as WebP
    // ]

    const eager =
      type === "image/svg+xml" ? undefined : transformations.join("|");

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

    return Response.json({
      success: true,
      uploadUrl: cloudinary.utils.api_url("upload"),
      fields: {
        ...options,
        api_key: process.env.CLOUDINARY_API_KEY,
        signature,
      },
      // could use this to help use the data client side. Might only need the names though.
      transformations: [...path.options.transformations.keys()],
    });
  };

export default presignedUrlAction;

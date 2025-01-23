"use server";

import Image from "../../../db/Image";

export default async function uploadCompleteAction({
  // tmpName,
  filename,
  folder,
  data,
}) {
  if (!filename) {
    throw Error("Filename is required");
  }

  const [og, square] = data.eager;

  const sizes = [
    [
      "original",
      {
        width: og.width,
        height: og.height,
        format: og.format,
        bytes: og.bytes,
        url: og.secure_url,
        transformation: og.transformation,
      },
    ],

    [
      "libraryThumbnail",
      {
        square: true,
        width: square.width,
        height: square.height,
        format: square.format,
        bytes: square.bytes,
        url: square.secure_url,
        transformation: square.transformation,
      },
    ],
  ];

  const imageDB = new Image({
    filename,
    folder,
    asset_id: data.asset_id,
    public_id: data.public_id,
    version: data.version,
    version_id: data.version_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
    url: data.secure_url,
    asset_folder: data.asset_folder,
    display_name: data.display_name,
    original_filename: data.original_filename,
    sizes: new Map(sizes),
  });

  await imageDB.save();
  return { success: true };
}

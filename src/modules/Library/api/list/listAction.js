"use server";

import Image from "../../db/Image";
import errorLog from "@kenstack/log/error";

export default async function listAction({ activeFolder, trash }) {
  if (activeFolder === undefined) {
    throw Error("activeFolder is undefined");
  }
  if (trash === undefined) {
    throw Error("trash is undefined");
  }

  let images;
  try {
    images = await Image.find(
      trash ? { "meta.deleted": true } : { folder: activeFolder },
      ["filename", "sizes.libraryThumbnail"],
    )
      // .populate();
      .sort({ priority: 1 });
  } catch (e) {
    errorLog(e, "Problem querying library image list");
    return { error: "There was an unexpected error. Please try again later" };
  }

  return {
    success: true,
    files: images.map((i) => {
      return i.toDTO("libraryThumbnail");
    }),
  };
}

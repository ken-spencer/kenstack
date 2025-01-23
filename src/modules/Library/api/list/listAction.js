"use server";

import Image from "../../db/Image";
import errorLog from "@kenstack/log/error";
import escapeRegExp from "@kenstack/utils/escapeRegExp";

export default async function listAction({ activeFolder, keywords, trash }) {
  if (activeFolder === undefined) {
    throw Error("activeFolder is undefined");
  }
  if (trash === undefined) {
    throw Error("trash is undefined");
  }

  let images;
  let query = Image.find({}, ["filename", "sizes.libraryThumbnail"]);

  if (trash) {
    query = query.where("meta.deleted").equals(true);
  } else if (!keywords) {
    query = query.where("folder").equals(activeFolder);
  }

  if (keywords) {
    const keywordRegex = new RegExp(escapeRegExp(keywords), "i");
    query = query.where({
      $or: [
        { filename: { $regex: keywordRegex } },
        { alt: { $regex: keywordRegex } },
      ],
    });
  }
  query = query.sort({ priority: 1 });

  try {
    images = await query.exec();
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

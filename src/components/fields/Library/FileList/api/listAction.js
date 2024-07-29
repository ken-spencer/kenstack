"use server";

import Image from "../../db/Image";
import acl from "@thaumazo/cms/auth/acl";
import errorLog from "@thaumazo/cms/log/error";

const listAction = async (activeFolder, trash) =>
  acl("ADMIN", async () => {
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
  });

export default listAction;

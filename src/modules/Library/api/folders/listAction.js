"use server";

import Folder from "../../db/Folder";

import errorLog from "@kenstack/log/error";

export default async function listAction() {
  let folders;
  try {
    folders = await Folder.find({})
      // .populate()
      .sort({ priority: 1 });
  } catch (e) {
    errorLog(e, "Problem querying library folder list");
    return { error: "There was an unexpected error. Please try again later" };
  }

  return {
    success: true,
    folders: folders.map((f) => {
      return f.toDTO();
    }),
  };
}

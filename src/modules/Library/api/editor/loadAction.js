"use server";

import Image from "../../db/Image";
import errorLog from "@kenstack/log/error";

import defaultError from "@kenstack/defaultError";

export default async function loadAction({ id }) {
  if (id === undefined) {
    throw Error("id is required");
  }

  let file;
  try {
    file = await Image.findById(id);
  } catch (e) {
    errorLog(e, "Problem loading library image", { id });
    return defaultError;
  }

  // const original  = file.sizes.get('original');
  return {
    success: true,
    file: file.toDTO("original"),
  };
}

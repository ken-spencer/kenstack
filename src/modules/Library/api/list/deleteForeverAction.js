"use server";

import Image from "../../db/Image";
import errorLog from "@kenstack/log/error";
// import auditLog from "@kenstack/log/audit";
import defaultError from "@kenstack/defaultError";

import mongoose from "mongoose";

export default async function deleteForeverAction({ idArray }) {
  try {
    await Image.deleteMany({
      _id: { $in: idArray.map((id) => new mongoose.Types.ObjectId(id)) },
      "meta.deleted": true,
    });
  } catch (e) {
    errorLog(e, "Problem permanently deleting images", { idArray });
    return defaultError;
  }

  return { success: true };
}

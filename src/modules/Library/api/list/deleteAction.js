"use server";

import Image from "../../db/Image";
import errorLog from "@kenstack/log/error";
// import auditLog from "@kenstack/log/audit";
import defaultError from "@kenstack/defaultError";

import mongoose from "mongoose";

// Delete or Undelete
export default async function deleteAction({ idArray, trash }) {
  try {
    await Image.updateMany(
      {
        _id: { $in: idArray.map((id) => new mongoose.Types.ObjectId(id)) },
      },
      { $set: { "meta.deleted": !trash } },
      { trash: false },
    );
  } catch (e) {
    errorLog(e, `Problem ${trash ? "" : "Un"}deleting library images: `, {
      idArray,
    });
    return defaultError;
  }

  return { success: true };
}

"use server";

import Image from "../../db/Image";
import errorLog from "@kenstack/log/error";
import auditLog from "@kenstack/log/audit";
import defaultError from "@kenstack/defaultError";

import mongoose from "mongoose";

export default async function saveMoveAction({ idArray, activeFolder }) {
  let images;
  try {
    images = await Image.find(
      {
        folder: activeFolder,
        _id: { $nin: idArray.map((id) => new mongoose.Types.ObjectId(id)) },
      },
      ["_id"]
    ).sort({ priority: 1 });
  } catch (e) {
    errorLog(e, "Problem querying library image list");
    return defaultError;
  }

  let count = 0;
  const query = idArray.map((id) => {
    count++;
    return {
      updateOne: {
        filter: { _id: id, folder: activeFolder },
        update: { $set: { priority: count } },
      },
    };
  });

  // edge case, but drop any images mist above at the end.
  images.forEach((image) => {
    count++;
    query.push({
      updateOne: {
        filter: { _id: image._id, folder: activeFolder },
        update: { $set: { priority: count } },
      },
    });
  });

  try {
    await Image.bulkWrite(query);
  } catch (e) {
    errorLog(e, "Problem saving library image order");
    return defaultError;
  }

  auditLog("library-move-file", "Library files moved", {
    idArray,
    activeFolder,
  });

  return {
    success: true,
  };
}

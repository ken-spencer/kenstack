"use server";

import Image from "../../db/Image";
import acl from "@admin/auth/acl";
import errorLog from "@admin/log/error";
import auditLog from "@admin/log/audit";
import defaultError from "@admin/defaultError";

import mongoose from "mongoose";

const saveMoveAction = async ({ idArray, activeFolder }) =>
  acl("ADMIN", async () => {

    let images;
    try {
      images = await Image.find(
        {
          folder: activeFolder,
          _id: { $nin: idArray.map((id) => new mongoose.Types.ObjectId(id)) },
        },
        ["_id"],
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
  });

export default saveMoveAction;

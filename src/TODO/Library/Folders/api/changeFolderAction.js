"use server";

import Image from "../../db/Image";
import acl from "@kenstack/auth/acl";
import errorLog from "@kenstack/log/error";
import auditLog from "@kenstack/log/audit";
// import mongoose from "mongoose";

import defaultError from "@kenstack/defaultError";

const changeFolderAction = async ({ idArray, folder }) =>
  acl("ADMIN", async () => {
    let rows;
    try {
      rows = await Image.find({ folder }, ["priority"])
        .sort({ priority: -1 })
        .limit(1);
    } catch (e) {
      errorLog(e, "Problem calculating max library priority");
      return defaultError;
    }
    const max = rows[0] ? rows[0].priority : 0;

    let count = max;
    const query = idArray.map((id) => {
      count++;
      return {
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              priority: count,
              folder,
              "meta.deleted": false,
            },
          },
        },
      };
    });

    try {
      await Image.bulkWrite(query);
    } catch (e) {
      errorLog(e, "Problem saving library folder change");
      return defaultError;
    }

    auditLog("library-change-folder", "Library files moved to new folder", {
      idArray,
      folder,
    });

    return { success: true };
  });

export default changeFolderAction;

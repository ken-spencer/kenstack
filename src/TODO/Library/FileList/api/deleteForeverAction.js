"use server";

import Image from "../../db/Image";
import acl from "@admin/auth/acl";
import errorLog from "@admin/log/error";
// import auditLog from "@admin/log/audit";
import defaultError from "@admin/defaultError";

import mongoose from "mongoose";

const deleteForeverAction = async ({ idArray }) =>
  acl("ADMIN", async () => {
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
  });

export default deleteForeverAction;

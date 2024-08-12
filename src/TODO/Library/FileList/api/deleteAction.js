"use server";

import Image from "../../db/Image";
import acl from "@admin/auth/acl";
import errorLog from "@admin/log/error";
// import auditLog from "@admin/log/audit";
import defaultError from "@admin/defaultError";

import mongoose from "mongoose";

// Delete or Undelete
const deleteAction = async ({ idArray, trash }) =>
  acl("ADMIN", async () => {
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
  });

export default deleteAction;

"use server";

import Folder from "../../db/Folder";
import Image from "../../db/Image";
import acl from "@kenstack/auth/acl";
import defaultError from "@kenstack/defaultError";

import errorLog from "@kenstack/log/error";

const deleteAction = async (id) =>
  acl("ADMIN", async () => {
    try {
      await Image.updateMany(
        {
          folder: id,
        },
        { $set: { "meta.deleted": true, folder: null } },
      );
    } catch (e) {
      errorLog(e, "Problem deleting library folder (images): " + id);
      return defaultError;
    }

    try {
      await Folder.findByIdAndDelete(id);
    } catch (e) {
      errorLog(e, "Problem deleting library folder: " + id);
      return defaultError;
    }

    return { success: true };
  });

export default deleteAction;

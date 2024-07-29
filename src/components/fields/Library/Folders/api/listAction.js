"use server";

import Folder from "../../db/Folder";
import acl from "@thaumazo/cms/auth/acl";

import errorLog from "@thaumazo/cms/log/error";

const listAction = async () =>
  acl("ADMIN", async () => {
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
  });

export default listAction;

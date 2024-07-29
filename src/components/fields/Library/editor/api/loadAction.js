"use server";

import Image from "../../db/Image";
import acl from "@thaumazo/cms/auth/acl";
import errorLog from "@thaumazo/cms/log/error";

import defaultError from "@thaumazo/cms/defaultError";

const loadAction = async (id) =>
  acl("ADMIN", async () => {
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
  });

export default loadAction;

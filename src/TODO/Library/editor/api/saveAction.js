"use server";

import Image from "../../db/Image";
import acl from "@kenstack/auth/acl";
import errorLog from "@kenstack/log/error";

import defaultError from "@kenstack/defaultError";

const loadAction = async (props) =>
  acl("ADMIN", async () => {
    if (props.id === undefined) {
      throw Error("id is required");
    }

    let file;
    try {
      file = await Image.findById(props.id);
    } catch (e) {
      errorLog(e, "Problem loading library image", props);
      return defaultError;
    }

    switch (props.action) {
      case "alt":
        file.alt = props.alt;
        break;
      default:
        return { error: `Unknown action: ${props.action}` };
    }

    try {
      await file.save();
    } catch (e) {
      errorLog(e, "Problem saving library data", props);
      return defaultError;
    }

    return {
      success: true,
    };
  });

export default loadAction;

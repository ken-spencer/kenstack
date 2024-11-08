"use server";

import Image from "../../db/Image";
import errorLog from "@kenstack/log/error";

import defaultError from "@kenstack/defaultError";

export default async function saveEditorAction(props) {
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
    case "field":
      {
        const fields = ["alt"];
        if (fields.includes(props.name) !== true) {
          return { error: `Unable to save to unknown field: ${props.name}` };
        }
        file[props.name] = props.value;
      }
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
}

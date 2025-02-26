import apiAction from "@kenstack/server/apiAction";

import clientModel from "@kenstack/client/Model";
import { notFound } from "next/navigation";

import saveAction from "./save";
import loadTags from "./loadTags";
import getPresignedUrl from "@kenstack/forms/Image/api/cloudinary/presignedUrl";

const API = ({ session, admin, model }) => {
  if (!(admin instanceof clientModel)) {
    throw Error("admin model must be an instance of clientModel");
  }

  const POST = async (request, { id, slug }) => {
    // const { id, slug } = await params;
    let isNew = false;
    if (id === "new") {
      isNew = true;
      id = null;
    } else if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      notFound();
    }

    let action;
    switch (slug) {
      case "save":
        action = saveAction;
        break;
      case "load-tags":
        action = loadTags;
        break;
      case "get-presigned-url":
        action = getPresignedUrl;
        break;
      default:
        notFound();
        break;
    }

    return await apiAction(action, request, {
      id,
      isNew,
      session,
      admin,
      model,
      roles: ["ADMIN"],
    });
  };

  return { POST };
};

export default API;

import apiAction from "@kenstack/server/apiAction";
import { notFound } from "next/navigation";

// list
import listAction from "./list/listAction";
import deleteAction from "./list/deleteAction";
import deleteForeverAction from "./list/deleteForeverAction";
import saveMoveAction from "./list/saveMoveAction";

import presignedUrlAction from "./upload/cloudinary/presignedUrl";
import uploadCompleteAction from "./upload/cloudinary/uploadComplete";

// Folders

import listFolders from "./folders/listAction";
import deleteFolder from "./folders/deleteAction";
import saveFolder from "./folders/saveAction";
import saveFolderOrder from "./folders/saveOrderAction";
import changeFolderAction from "./folders/changeFolderAction";

// edit
import editLoadAction from "./editor/loadAction";
import saveEditAction from "./editor/saveAction";

const actions = {
  // list
  list: listAction,
  "delete-files": deleteAction,
  "delete-forever": deleteForeverAction,
  "save-move": saveMoveAction,
  "get-presigned-url": presignedUrlAction,
  "upload-complete": uploadCompleteAction,

  // Folders
  "list-folders": listFolders,
  "save-folder": saveFolder,
  "delete-folder": deleteFolder,
  "save-folder-order": saveFolderOrder,
  "change-folder": changeFolderAction,

  // edit
  edit: editLoadAction,
  "save-edit": saveEditAction,
};

const API = ({ session }) => {
  const POST = async (request, { params }) => {
    const { slug } = await params;
    let action = actions[slug[0]] || notFound();

    return await apiAction(action, request, {
      session,
      roles: ["ADMIN"],
    });
  };

  return { POST };
};

export default API;

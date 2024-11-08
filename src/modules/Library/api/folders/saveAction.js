"use server";

import Folder from "../../db/Folder";
import errorLog from "@kenstack/log/error";

export default async function saveAction({ id, title }) {
  let folder;
  if (id === null) {
    folder = new Folder({ priority: 1 });
    try {
      await Folder.updateMany({}, { $inc: { priority: 1 } });
    } catch (e) {
      errorLog(e, "Problem updating library folder order increment");
    }
  } else {
    folder = await Folder.findById(id);
  }

  if (!folder) {
    return {
      error: "Error loading folder. Was it deleted?",
    };
  }

  folder.title = title;
  // folder.parentId = parentId;

  try {
    await folder.save();
  } catch (e) {
    errorLog(e, "Problem saving library folder");
    return {
      error:
        "There was an unexpected problem saving your change. Please try again later.",
    };
  }

  return { success: true, id: folder.id };
  /*
let res = await listAction();

if (res.success) {
  res.id = folder.id;
  return res;
}

return {error: "Save successful, however there wads an unexpected problem loading folders. " }
*/
}

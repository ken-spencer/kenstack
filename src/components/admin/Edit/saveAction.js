"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
// import { headers } from 'next/headers'

// import authenticate from "../../../auth/authenticate";
import accessCheck from "@thaumazo/cms/auth/accessCheck";

import errorLog from "../../../log/error";

export default async function saveAction(
  { pathName, isNew, id, modelName },
  init,
  formData,
) {
  const admin = thaumazoAdmin.get(modelName);
  const model = await thaumazoModels.get(modelName);
  if (!admin || !model) {
    return { error: "Configuration problem. Missing data for: " + modelName };
  }

  // const user = await authenticate(["ADMIN"]);
  const user = await accessCheck(["ADMIN"]);

  if (!user) {
    return {
      login: "You have been logged out. Please login again to continue",
      type: "soft",
    };
  }

  if (!model) {
    errorLog(new Error("Unable to find model: " + modelName));
    return { error: "Unknown model" };
  }

  let doc;

  if (isNew) {
    doc = new model();
  } else {
    try {
      doc = await model.findById(id);
    } catch (e) {
      errorLog(e, "Problem loading model in admin edit");
      return {
        error:
          "There was an unexpected problem saving your data. Please try again later.",
      };
    }
  }

  if (!doc) {
    return { error: "There was a problem finding the record. Was it deleted?" };
  }

  let action = formData.get("adminAction");
  formData.delete("adminAction");
  let actionInfo = {};
  if (action && action.match(/^\[/)) {
    const json = JSON.parse(action);
    [action, actionInfo] = json;
  }

  const basePath = pathName.replace(/\/[^/]*$/, "");

  const fields = admin.getFields();
  const errors = await doc.bindFormData(fields, formData);
  if (action === "delete") {
    if (id == user._id) {
      return {
        error: "You can't delete your own account.",
      };
    }

    try {
      await doc.trash();
    } catch (e) {
      errorLog(e, "Problem deleting document");
      return {
        error:
          "There was an unexpected problem deleting your data. Please try again later.",
      };
    }
    redirect(basePath);
  } else {
    if (errors) {
      return errors;
    }

    try {
      await doc.saveLog(user);
    } catch (e) {
      errorLog(e, "Problem saving model");
      return {
        error:
          "There was an unexpected problem saving your data. Please try again later.",
      };
    }
  }

  if (isNew && action === "save") {
    // const referer = headers().get("referer");
    let path = pathName.replace(/new$/, doc._id);
    return {
      success: "Saved",
      redirect: path,
    };
  }

  if (actionInfo.path) {
    return {
      success: "Saved",
      redirect: actionInfo.path,
    };
  }

  revalidatePath(pathName);
  revalidatePath(basePath);
  return {
    success: "Changes saved successfully",
    row: doc.toAdminDTO(admin.getPaths()),
  };
}

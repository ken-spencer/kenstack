"use server";

import { revalidatePath } from "next/cache";

import errorLog from "../../../log/error";

export default async function saveAction(
  { adminAction: action, ...values },
  { session, model, admin, id, isNew, pathname },
) {
  const user = await session.getAuthenticatedUser();

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
    return {
      error: "There was a problem finding the record. Was it deleted?",
    };
  }

  // formData.delete("adminAction");
  // TODO Ensure this is working.
  let actionInfo = {};
  if (action && action.match(/^\[/)) {
    const json = JSON.parse(action);
    [action, actionInfo] = json;
  }

  const basePath = pathname.replace(/\/[^/]*$/, "");
  const fields = admin.form.getFields();
  // const errors = await doc.bindFormData(fields, formData);
  const errors = await doc.bindValues(fields, values);
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
    return { redirect: basePath };
  } else {
    if (errors) {
      return errors;
    }

    await doc.save();

    // try {
    //   await doc.save();
    // } catch (e) {
    //   errorLog(e, "Problem saving model");
    //   return {
    //     error:
    //       "There was an unexpected problem saving your data. Please try again later.",
    //   };
    // }
  }

  if (isNew && action === "save") {
    // const referer = headers().get("referer");
    let path = pathname.replace(/new$/, doc._id);
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

  revalidatePath(pathname);
  revalidatePath(basePath);
  return {
    success: "Changes saved successfully",
    row: doc.toAdminDTO(admin),
  };
}

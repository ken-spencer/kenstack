"use server";

import errorLog from "@admin/log/error";

export default async function deleteAction(selected, { model }) {
  let result;
  try {
    result = await model.trashMany(selected);
  } catch (e) {
    errorLog(e, "Error trashing records");
    return {
      error: "There was an unexpected problem. Please try again later",
    };
  }

  return {
    success:
      result.deletedCount + " record(s) have successfully been deleted",
  };
};


"use server";

import authenticate from "../../../auth/authenticate";
import errorLog from "../../../log/error";

export default async function deleteAction({ modelName, selected }) {
  await authenticate(["ADMIN"]);

  const model = await thaumazoModels.get(modelName);
  if (!model) {
    errorLog(new Error("Unable to find model: " + modelName));
    return { error: "Unknown model" };
  }

  let result;
  try {
    result = await model.trashMany(selected);
  } catch (e) {
    errorLog(e, "Error trashing records");
    return { error: "There was an unexpected problem. Please try again later" };
  }

  return {
    success: result.deletedCount + " record(s) have successfully been deleted",
  };
}

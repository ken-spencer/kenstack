"use server";

import authenticate from "../../../../auth/authenticate";
import errorLog from "../../../../log/error";

export default async function checkAction() {
  await authenticate(["ADMIN"]);

  for (let name of thaumazoModels.models.keys()) {
    const model = await thaumazoModels.get(name);
    try {
      await model.syncIndexes();
    } catch (e) {
      errorLog(e, "Problem syncing indexes for: " + name);
      return false;
    }
  }

  return true;
}

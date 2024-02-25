"use server";

import accessCheck from "@thaumazo/cms/auth/accessCheck";
import errorLog from "../../../../log/error";

export default async function checkAction() {
  const user = await accessCheck(["ADMIN"]);
  if (!user) {
    return 0;
  }

  let count = 0;
  for (let name of thaumazoModels.models.keys()) {
    const model = await thaumazoModels.get(name);
    await model.init();
    let diff;
    try {
      diff = await model.diffIndexes();
    } catch (e) {
      errorLog(e, "Problem checking indexes for: " + name);
      break;
    }
    if (diff.toDrop.length || diff.toCreate.length) {
      count++;
    }
  }

  return count;
}

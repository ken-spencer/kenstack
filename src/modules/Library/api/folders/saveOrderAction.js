"use server";

import Folder from "../../db/Folder";

import errorLog from "@kenstack/log/error";

// import util from 'util';

export default async function saveOrderAction(data) {
  if (!Array.isArray(data)) {
    return { error: "Invalid input" };
  }

  // convert input to bulk update
  const query = data.map(([id, priority]) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { priority: priority } },
    },
  }));

  try {
    await Folder.bulkWrite(query);
  } catch (e) {
    errorLog(e, "Problem saving library folder order");
    return { error: "There was a problem saving your request" };
  }

  return {
    success: true,
  };
}

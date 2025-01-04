"use server";
import mongoose from "mongoose";

export default async function deleteAction(idArray, { model }) {
  const result = await model.updateMany(
    {
      _id: { $in: idArray.map((id) => new mongoose.Types.ObjectId(id)) },
    },
    { $set: { "meta.deleted": true } },
    { trash: false }, // need this if we want to undelete with this code
  );

  const count = result.matchedCount;
  return {
    success: `${count} record${count === 1 ? "" : "s"} have successfully been deleted`,
  };
}

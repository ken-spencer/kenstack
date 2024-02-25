import mongoose from "../db";
const { Schema } = mongoose;

import loadUser from "../auth/loadUser";

const TrashSchema = new Schema({
  modelId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  modelName: {
    type: String,
    required: true,
    index: true,
  },
  document: {
    type: Schema.Types.Mixed,
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true,
    ref: "User",
  },
});

TrashSchema.pre("save", async function (next) {
  if (!this.deletedBy) {
    const user = await loadUser();
    if (user) {
      this.deletedAt = user._id;
    }
  }

  next();
});

export default mongoose.addModel("Trash", TrashSchema);

import mongoose from "mongoose";
import { dbConnect } from "@kenstack/db";

const { Schema } = mongoose;

const SessionSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    data: {},
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: { expires: "60m" }, // expire 60 minutes aftrer expiresAt is reached
    },
  },
  { timestamps: true },
);

const SessionStoreSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // expire immediatly when this date is reached.
    },
  },
  {
    timestamps: true, // for createdAt/updatedAt if needed
  },
);

SessionStoreSchema.index({ user: 1, key: 1 }, { unique: true });

const con = await dbConnect();
const Session = con.addModel("Session", SessionSchema);
const SessionStore = con.addModel("SessionStore", SessionStoreSchema);

export default Session;

export { SessionStore };

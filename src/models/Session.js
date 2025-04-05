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
      default: function () {
        let date = new Date();
        // expire in 24 hour
        date = date.setSeconds(date.getSeconds() + 60 * 3600 * 24);
        return date;
      },
      index: { expires: "60m" },
    },
  },
  { timestamps: true },
);

const con = await dbConnect();
const Session = con.addModel("Session", SessionSchema);

export default Session;

import mongoose from "mongoose";
import { dbConnect } from "@kenstack/db";

import { nanoid } from "nanoid";

import audit from "@kenstack/db/audit";
const { Schema } = mongoose;

const ForgottenPasswordSchema = new Schema(
  {
    ip: String,
    geo: {},
    token: {
      type: String,
      required: true,
      index: true,
      default: function () {
        return nanoid();
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    usedAt: Date,
    expiry: {
      type: Date,
      required: true,
      default: function () {
        let date = new Date();
        // expire in 15 jminutes;
        date = date.setMinutes(date.getMinutes() + 15);
        return date;
      },
    },
  },
  { timestamps: true }
);

audit(ForgottenPasswordSchema);

const con = await dbConnect();
const ForgottenPassword = con.addModel(
  "ForgottenPassword",
  ForgottenPasswordSchema
);

export default ForgottenPassword;

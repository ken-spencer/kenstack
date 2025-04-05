import mongoose from "mongoose";
import { dbConnect } from "@kenstack/db";
import isEmail from "validator/es/lib/isEmail";

const { Schema } = mongoose;

const LoginLogSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      set: (v) => v.toLowerCase().trim(),
      validate: (value) => {
        return isEmail(value);
      },
    },
    ip: String,
    geo: {},
  },
  { timestamps: true },
);

LoginLogSchema.index({ createdAt: -1 });

const con = await dbConnect();
const LoginLog = con.addModel("LoginLog", LoginLogSchema);

export default LoginLog;

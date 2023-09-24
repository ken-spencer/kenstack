import mongoose from "db";
import { nanoid } from "nanoid";

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
  { timestamps: true },
);

ForgottenPasswordSchema.methods.test = function (arg, cb) {
  cb(null, true);
};

// const ForgottenPassword = mongoose.models.ForgottenPassword || mongoose.model("ForgottenPassword", ForgottenPasswordSchema);
const ForgottenPassword = mongoose.addModel(
  "ForgottenPassword",
  ForgottenPasswordSchema,
);

export default ForgottenPassword;

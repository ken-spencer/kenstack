import mongoose from "../db";

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
        // expire in 1 hour
        date = date.setMinutes(date.getMinutes() + 60);
        return date;
      },
      index: { expires: '60m' },
    },
  },
  { timestamps: true },
);

const Session = mongoose.addModel("Session", SessionSchema);

export default Session;

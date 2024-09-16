import mongoose from "@kenstack/db";
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
  filename: { type: String, required: true },
  type: { type: String, required: true },
  format: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  path: { type: String, required: true },
});

export default ImageSchema;

import mongoose from "@kenstack/db";
import AdminSchema from "@kenstack/db/AdminSchema";
const Schema = mongoose.Schema;

// import Sharp from "sharp";
// import errorLog from "@kenstack/log/error";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client();

const SizeSchema = new Schema({
  format: String,
  square: { type: Boolean, default: false },
  bytes: Number,
  url: { type: String, required: true },
  // path: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  transformation: String,
});

const ImageSchema = new AdminSchema({
  filename: { type: String, required: true },
  asset_id: String,
  public_id: String,
  version: String,
  version_id: String,
  width: Number,
  height: Number,
  format: String,
  bytes: Number,
  url: { type: String, required: true },
  asset_folder: String,
  display_name: String,
  original_filename: String,
  // prefix: String,
  alt: { type: String, default: "" },
  folder: { type: Schema.Types.ObjectId, ref: "LibraryFolder", default: null },
  sizes: {
    type: Map,
    of: SizeSchema,
  },
  priority: {
    type: Number,
    index: true,
  },
  square: {
    zoom: {
      type: Number,
      default: 0,
      min: [0, "Zoom must be at least 0"],
      max: [100, "Zoom must be at most 100"],
    },
    cropX: {
      type: Number,
      default: 0,
    },
    cropY: {
      type: Number,
      default: 0,
    },
  },
});

// ImageSchema.methods.setSize = function (size, extension, width, height) {
//   const lowerName = this.filename.toLowerCase();
//   let ext = extname(lowerName);

//   let base = basename(lowerName, ext)
//     .replace(/(\s|_)+/g, "-")
//     .replace(/[^\w\-.]/g, "") // remove any non word characters
//     .replace(/--{2,}/g, "-") // remove any double dashes
//     .replace(/^\W+|\W+$/g, ""); // trim non word characters from beginning | end
//   if (base.length === 0) {
//     base = this.prefix;
//   }

//   const path = this.prefix + "/" + size + "/" + base + "." + extension;

//   if (!this.sizes) {
//     this.sizes = new Map();
//   }

//   this.sizes.set(size, {
//     path,
//     width,
//     height,
//   });

//   return path;
// };

ImageSchema.methods.toDTO = function (sizeName) {
  // const host = "https://" + process.env.AWS_S3_BUCKET + ".s3.amazonaws.com/";

  const size = this?.sizes.get(sizeName);
  let sizeData = {};
  if (size) {
    const { url, width, height } = size;
    sizeData = { url, width, height };
  }

  return {
    id: this._id ? this._id.toString() : null,
    filename: this.filename,
    alt: this.alt,
    ...sizeData,
    square: { ...this.square },
  };
};

async function s3Delete(doc) {
  for (let size of doc.sizes.values()) {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: size.path,
    });

    // console.log("Deleting: ", size.path);
    await s3.send(command);
  }
}

ImageSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    await s3Delete(this);
  },
);

ImageSchema.pre(
  "deleteOne",
  { document: false, query: true },
  async function () {
    const doc = await this.model.findOne(this.getFilter(), null, {
      trash: false,
    });
    if (doc) {
      await s3Delete(doc);
    }
  },
);

ImageSchema.pre("deleteMany", async function () {
  const docs = await this.model.find(this.getFilter(), null, { trash: false });
  for (const doc of docs) {
    await s3Delete(doc);
  }
});

const Image = mongoose.addModel("LibraryImage", ImageSchema);
export default Image;

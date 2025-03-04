import mongoose from "@kenstack/db";
const Schema = mongoose.Schema;

import cloudinaryToImage from "./utils/cloudinaryToImage";

const SizeSchema = new Schema({
  format: String,
  square: { type: Boolean, default: false },
  bytes: Number,
  url: { type: String /*required: true*/ },
  width: { type: Number /*required: true */ },
  height: { type: Number /*required: true */ },
  transformation: String,
});

const ImageSchema = new Schema({
  filename: { type: String /*required: true*/ },
  asset_id: String,
  public_id: String,
  version: String,
  version_id: String,
  width: Number,
  height: Number,
  format: String,
  bytes: Number,
  url: { type: String /*required: true*/ },
  asset_folder: String,
  display_name: String,
  original_filename: String,
  alt: { type: String, default: "" },
  sizes: {
    type: Map,
    of: SizeSchema,
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

const ImageFieldOptions = {
  type: ImageSchema,
  default: null,
  onAdminDTO: (value) => {
    if (!value) {
      return null;
    }

    const retval = {
      filename: value.filename,
      format: value.format,
      url: value.url,
    };

    if (value.sizes) {
      const { original: og, squareThumbnail: thumb } = value.sizes;
      retval.url = og.url;
      retval.thumbnailUrl = thumb.url;
    }

    return retval;
  },
  onBind: (value, { previous }) => {
    if (!value) {
      return null;
    }

    if (!value.upload) {
      return previous;
    }

    const { data, filename } = value;
    return cloudinaryToImage(data, filename);

    // const retval = {
    //   filename,
    //   asset_id: data.asset_id,
    //   public_id: data.public_id,
    //   version: data.version,
    //   version_id: data.version_id,
    //   width: data.width,
    //   height: data.height,
    //   format: data.format,
    //   bytes: data.bytes,
    //   url: data.secure_url,
    //   asset_folder: data.asset_folder,
    //   display_name: data.display_name,
    //   original_filename: data.original_filename,
    // };

    // if (data.format !== "svg") {
    //   const [og, square] = data.eager;

    //   retval.sizes = [
    //     [
    //       "original",
    //       {
    //         width: og.width,
    //         height: og.height,
    //         format: og.format,
    //         bytes: og.bytes,
    //         url: og.secure_url,
    //         transformation: og.transformation,
    //       },
    //     ],

    //     [
    //       "squareThumbnail",
    //       {
    //         square: true,
    //         width: square.width,
    //         height: square.height,
    //         format: square.format,
    //         bytes: square.bytes,
    //         url: square.secure_url,
    //         transformation: square.transformation,
    //       },
    //     ],
    //   ];
    // }

    // return retval;
  },
};

// function imagePlugin(scherma, name, options = {}) {
//   schema.add({
//     [name]: {
//      type: ImageSchema,
//       default: {},
//       ...options,
//     }
//   });
// }

export { ImageSchema, ImageFieldOptions };

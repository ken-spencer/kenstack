import mongoose from "mongoose";
const Schema = mongoose.Schema;

import cloudinaryToImage from "./utils/cloudinaryToImage";
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

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

export function imagePlugin(
  schema,
  { path = "image", transformations: localTransformations = null } = {},
) {
  let transformations = new Map([
    ["original", "f_webp"], // Original dimensions as WebP
    ["squareThumbnail", "w_200,h_200,c_thumb,g_center,f_webp"], // Thumbnail as WebP
  ]);

  if (localTransformations) {
    transformations = new Map([...transformations, ...localTransformations]);
  }

  schema.add({
    [path]: {
      ...ImageFieldOptions,
    },
  });

  schema.methods.getImage = async function (sizeName) {
    const data = this.get(path);

    if (!data) {
      return;
    }

    const transformation = transformations.get(sizeName);

    const size = data.sizes.get(sizeName);

    // cloudinary.api.resource("giveround/images/8j89ooj49a3amll/featured", function(error, result) {
    //   if (error) {
    //     console.error("Error fetching resource:", error);
    //   } else {
    //     console.log("Resource found:", result);
    //   }
    // });

    if (size && size.transformation === transformation) {
      return size;
    }

    let result;
    try {
      result = await cloudinary.uploader.explicit(data.public_id, {
        type: "upload",
        eager: [transformation],
        eager_async: false,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Cloudinary error: ", e);
      return null;
    }

    const [img] = result.eager;
    const retval = {
      width: img.width,
      height: img.height,
      format: img.format,
      bytes: img.bytes,
      url: img.secure_url,
      transformation: img.transformation,
    };

    data.sizes.set(sizeName, retval);
    const newData = { ...data };
    this.set(path, newData);
    await this.save();
    return retval;

    //   // console.log(data);
    //     const url = cloudinary.url(data.public_id, {
    //       transformation,
    //       // transformation: [{ width: 300, height: 300, crop: "fill" }],
    //       sign_url: true,
    //       secure: true,
    //     });

    // console.log('url', url);
  };
}

export { ImageSchema, ImageFieldOptions };

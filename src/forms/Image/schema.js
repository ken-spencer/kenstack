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

const SizeSchema = new Schema(
  {
    format: String,
    square: { type: Boolean, default: false },
    bytes: Number,
    url: { type: String /*required: true*/ },
    width: { type: Number /*required: true */ },
    height: { type: Number /*required: true */ },
    transformation: String,
  },
  { _id: false }
);

const SquareSchema = new Schema(
  {
    zoom: {
      type: Number,
      // default: 0,
      min: [0, "Zoom must be at least 0"],
      max: [100, "Zoom must be at most 100"],
    },
    cropX: {
      type: Number,
      // default: 0,
    },
    cropY: {
      type: Number,
      // default: 0,
    },
  },
  { _id: false }
);

const ImageSchema = new Schema(
  {
    filename: { type: String /*required: true*/ },
    asset_id: String,
    public_id: String,
    version: Number,
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
      type: SquareSchema,
      default: null,
    },
  },
  { _id: false }
);

ImageSchema.methods.toDTO = function () {
  const retval = {
    filename: this.filename,
    format: this.format,
    url: this.url,
    sizes: {},
  };

  if (this.sizes) {
    for (const [name, size] of this.sizes) {
      retval.sizes[name] = {
        url: size.url,
        width: size.width,
        height: size.height,
      };
    }
    // const og = this.sizes.get('original');
    // const thumb = this.sizes.get('squareThumbnail');
    // retval.url = og.url;
    // retval.thumbnailUrl = thumb.url;
  }

  return retval;
};

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
  onBind: (value, { previous, path, options }) => {
    if (!value) {
      if (previous) {
        // mongoose won't delete subdoc by just setting to null
        previous.remove();
        // previous.ownerDocument.markModified(path)
      }
      return null;
    }

    if (!value.upload) {
      return previous;
    }

    const { data, filename } = value;
    return cloudinaryToImage(data, filename, options.transformations);
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
  { path = "image", transformations: localTransformations = null } = {}
) {
  let transformations = new Map([
    ["original", "f_webp"], // Original dimensions as WebP
    ["thumbnail", "w_200,h_200,c_limit,f_webp"], // original dimension thumbnail
    ["squareThumbnail", "w_200,h_200,c_thumb,g_center,f_webp"], // Thumbnail as WebP
  ]);

  if (localTransformations) {
    transformations = new Map([...transformations, ...localTransformations]);
  }

  schema.add({
    [path]: {
      ...ImageFieldOptions,
      transformations,
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

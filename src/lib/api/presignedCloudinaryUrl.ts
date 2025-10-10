import * as z from "zod";
import unsecureId from "@kenstack/admin/utils/unsecureId";
import normalizeFilename from "@kenstack/admin/utils/normalizeFilename";

const postSchema = z.object({
  name: z.string(),
  type: z.string(),
  filename: z.string(),
});

import { v2 as cloudinary, type SignApiOptions } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

import acceptDefault from "@kenstack/forms/ImageField/accept";
import transformationsDefault from "@kenstack/forms/ImageField/transformations";

import { type PipelineAction } from "@kenstack/lib/api";
import { SchemaFactory } from "@kenstack/schemas";

type PipelineOptions = {
  /* schema where image fieldis is located */
  schema: z.ZodObject | SchemaFactory;
  accept?: string[];
  folder?: string;
  transformations?: Record<string, string>;
};

const presignedUrlAction =
  ({
    schema: schemaOrFactory,
    folder: baseFolder = "/images",
    accept = acceptDefault,
    transformations = {},
  }: PipelineOptions): PipelineAction<typeof postSchema> =>
  async ({ dataIn, response }) => {
    const parsed = postSchema.safeParse(dataIn);
    if (!parsed.success) {
      return response.error("Invalid image upload");
    }
    const { filename, type, name } = parsed.data;
    const schema =
      typeof schemaOrFactory === "function"
        ? schemaOrFactory("server")
        : schemaOrFactory;
    if (
      !name ||
      !schema.shape[name] ||
      schema.shape[name].description !== "image-field"
    ) {
      return response.error(`"${name}" is not a valid image field`);
    }

    if (!accept.includes(type)) {
      return response.error(`Invalid file type ${type}`);
    }
    const folder = baseFolder + "/" + unsecureId();

    const public_id = normalizeFilename(filename);

    const finalTransformations = {
      ...transformationsDefault,
      ...transformations,
    };

    const eager =
      type === "image/svg+xml"
        ? undefined
        : Object.values(finalTransformations).join("|");

    const options: SignApiOptions = {
      timestamp: Math.floor(Date.now() / 1000),
      folder,
      public_id,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      eager,
      // tags: "provisional",
    };

    const signature = cloudinary.utils.api_sign_request(
      options,
      process.env.CLOUDINARY_API_SECRET
    );

    return response.success({
      uploadUrl: cloudinary.utils.api_url("upload"),
      fields: {
        ...options,
        api_key: process.env.CLOUDINARY_API_KEY,
        signature,
      },
      transformations: eager ? Object.keys(finalTransformations) : {},
    });
  };

export default presignedUrlAction;

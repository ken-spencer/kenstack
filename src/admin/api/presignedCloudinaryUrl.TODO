import * as z from "zod";

import presignedUrlAction from "@kenstack/lib/api/presignedCloudinaryUrl";

import acceptDefault from "@kenstack/forms/ImageField/accept";

import { pipeline, type PipelineAction } from "@kenstack/lib/api";
import { type AdminServerConfig } from "../types";

const presignedUrl = (request, adminConfig: AdminServerConfig) => {
  const schema =
    typeof adminConfig.schema === "function"
      ? adminConfig.schema("server")
      : adminConfig.schema;
  if (!(schema instanceof z.ZodObject)) {
    throw Error("Schema must be an instance of ZodObject");
  }

  return pipeline(request, null, [presignedUrlWrapper(adminConfig)]);
};

const presignedUrlWrapper =
  (adminConfig): PipelineAction =>
  (params) => {
    const name = params.dataIn.name;
    if (typeof name !== "string") {
      return params.response.error("invalid image field name");
    }

    const accept =
      (adminConfig.fields && adminConfig.fields[name]?.accept) ?? acceptDefault;

    const folder =
      (adminConfig.fields && adminConfig.fields[name]?.folder) ??
      `${adminConfig.collection}/${name}`;

    const transformations =
      (adminConfig.fields && adminConfig.fields[name]?.transformations) ?? {};

    return presignedUrlAction({
      schema: adminConfig.schema,
      accept,
      folder,
      transformations,
    })(params);
  };
//   async ({ data, schema, response }) => {
//     // const dataParsed: SchemaType = schema.parse(data);
//     const { filename, type, name } = data;

//     if (
//       !name ||
//       !(schema instanceof z.ZodObject) ||
//       !schema.shape[name] ||
//       schema.shape[name].desired !== "image-field"
//     ) {
//       return response.error(`"${name}" is not a valid image field`);
//     }

//     const accept =
//       (adminConfig.fields && adminConfig.fields[name]?.accept) ?? acceptDefault;

//     if (!accept.includes(type)) {
//       return response.error(`Invalid file type ${type}`);
//     }
//     const baseFolder =
//       (adminConfig.fields && adminConfig.fields[name]?.folder) ??
//       `${adminConfig.collection}/${name}`;
//     const folder = baseFolder + "/" + unsecureId();

//     const public_id = normalizeFilename(filename);

//     const transformations =
//       (adminConfig.fields && adminConfig.fields[name]?.transformations) ??
//       transformationsDefault;

//     const eager =
//       type === "image/svg+xml"
//         ? undefined
//         : Object.values(transformations).join("|");

//     const options: SignApiOptions = {
//       timestamp: Math.floor(Date.now() / 1000),
//       folder,
//       public_id,
//       use_filename: true,
//       unique_filename: false,
//       overwrite: true,
//       eager,
//       // tags: "provisional",
//     };

//     const signature = cloudinary.utils.api_sign_request(
//       options,
//       process.env.CLOUDINARY_API_SECRET
//     );

//     return response.success({
//       uploadUrl: cloudinary.utils.api_url("upload"),
//       fields: {
//         ...options,
//         api_key: process.env.CLOUDINARY_API_KEY,
//         signature,
//       },
//       transformations: Object.keys(transformations),
//     });
//   };

export default presignedUrl;

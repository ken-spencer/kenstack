type ProjectImageProps = {
  field: string;
  size?: string;
};

export type Image = {
  src: string;
  width: number;
  height: number;
};

import * as z from "zod";
export const imageProjectionSchema: z.ZodType<Image> = z.object({
  src: z.string(),
  width: z.number(),
  height: z.number(),
});

const projectImage = ({ field, size = "thumbnail" }: ProjectImageProps) => {
  return {
    $cond: [
      // if format === "svg"
      { $eq: [`$${field}.format`, "svg"] },
      // then
      {
        width: `$${field}.width`,
        height: `$${field}.height`,
        src: `$${field}.url`,
      },
      // else
      {
        src: `$${field}.sizes.${size}.url`,
        width: `$${field}.sizes.${size}.width`,
        height: `$${field}.sizes.${size}.height`,
      },
    ],
  };
};

export default projectImage;

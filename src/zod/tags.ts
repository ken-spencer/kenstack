import kebabCase from "lodash-es/kebabCase";
import * as z from "zod";

export const tagsSchema = z.array(
  z
    .object({
      name: z.string().trim().min(1, "Tag name must be at least 1 character"),
    })
    .transform(({ name }) => ({
      name,
      slug: kebabCase(name),
    })),
);

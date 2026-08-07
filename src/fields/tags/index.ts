import kebabCase from "lodash-es/kebabCase";
import * as z from "zod";

import { defineField } from "../field";

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

export const tagField = defineField({
  default: [],
  zod: tagsSchema,
  kind: "tags",
});

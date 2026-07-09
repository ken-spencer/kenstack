import { defineFields } from "@kenstack/admin/fields";
import { imageField, textField } from "@kenstack/fields/client";
import * as z from "zod";

export const fields = defineFields({
  fields: {
    title: textField({
      default: "Kenstack",
      zod: z.string().trim().min(1, "Title is required"),
    }),
    titleTemplate: textField({
      default: "",
      zod: z.literal("").or(
        z
          .string()
          .trim()
          .refine(
            (value) => value.includes("%s"),
            'Title template must include "%s".',
          ),
      ),
    }),
    ogImage: imageField(),
  },
});

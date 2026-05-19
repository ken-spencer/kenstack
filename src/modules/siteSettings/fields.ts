import { defineFields } from "@kenstack/admin/fields";
import * as z from "zod";

export const fields = defineFields({
  title: {
    default: "Kenstack",
    zod: z.string().trim().min(1, "Title is required"),
  },
  titleTemplate: {
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
  },
  ogImage: { kind: "image" },
});

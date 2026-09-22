import * as z from "zod";

import { field } from "@kenstack/fields";
import { unsecureIdSchema } from "@kenstack/fields/unsecureId";

export function ratesField(taxCategories: Record<string, string>) {
  return field({
    default: [],
    label: "Tax rates",
    zod: z
      .array(
        z.object({
          categories: z.array(z.enum(Object.keys(taxCategories))).default([]),
          code: z
            .string()
            .trim()
            .toUpperCase()
            .min(1, "Tax code is required")
            .max(16, "Tax code must be 16 characters or fewer")
            .regex(
              /^[A-Z0-9_-]+$/,
              "Use letters, numbers, hyphens, or underscores",
            ),
          id: unsecureIdSchema,
          name: z
            .string()
            .trim()
            .min(1, "Tax name is required")
            .max(128, "Tax name must be 128 characters or fewer"),
          ratePercent: z
            .string()
            .trim()
            .min(1, "Tax rate is required")
            .regex(
              /^\d+(?:\.\d{1,4})?$/,
              "Enter a percentage such as 5 or 7.25",
            )
            .refine(
              (value) => Number(value) <= 100,
              "Tax rate must be 100% or less",
            ),
        }),
      )
      .superRefine((rates, ctx) => {
        const ids = new Set<string>();
        const codes = new Set<string>();

        rates.forEach((rate, index) => {
          if (ids.has(rate.id)) {
            ctx.addIssue({
              code: "custom",
              message: "Tax rate IDs must be unique",
              path: [index, "id"],
            });
          }

          if (codes.has(rate.code)) {
            ctx.addIssue({
              code: "custom",
              message: "Tax codes must be unique",
              path: [index, "code"],
            });
          }

          ids.add(rate.id);
          codes.add(rate.code);
        });
      })
      .default([]),
  });
}

export type RateValue = z.output<ReturnType<typeof ratesField>["zod"]>[number];

import * as z from "zod";
import isEmail from "validator/lib/isEmail";
import tlds from "tlds";

import { defineField } from "../field";

// Stored and compared form of an address, matching what the schema accepts.
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((val, ctx) => {
    if (val === "") {
      ctx.addIssue({
        code: "custom",
        message: "Email is required",
      });
      return;
    }

    if (!isEmail(val, { require_tld: true })) {
      ctx.addIssue({
        code: "custom",
        message: "Email address is invalid",
      });

      return;
    }

    const lastLabel = val.split("@")[1]?.split(".").pop();
    if (!lastLabel) {
      ctx.addIssue({
        code: "custom",
        message: "Email address is invalid",
      });
      return;
    }

    if (!tlds.includes(lastLabel)) {
      ctx.addIssue({
        code: "custom",
        message: `${lastLabel} is not a valid top level domain`,
      });
    }
  });

export const emailField = defineField({
  kind: "email",
  default: "",
  filterKind: "text",
  zod: email,
});

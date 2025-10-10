import * as z from "zod";
import isEmail from "validator/es/lib/isEmail";
import tlds from "tlds";

const emailSchema = () =>
  z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((val, ctx) => {
      if (val.trim() === "") {
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

      const domain = val.split("@")[1]?.toLowerCase();
      if (!domain) {
        ctx.addIssue({
          code: "custom",
          message: "Email address is invalid",
        });
        return;
      }

      const lastLabel = domain.split(".").pop();
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
        return;
      }
    });

export default emailSchema;

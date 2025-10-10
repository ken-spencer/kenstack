import * as z from "zod";

const facebookSchema = () =>
  z.url().regex(/^https?:\/\/(www\.)?facebook\.com\/[A-Za-z0-9.]+\/?$/, {
    message: "Invalid Facebook URL",
  });
export default facebookSchema;

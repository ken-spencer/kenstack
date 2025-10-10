import * as z from "zod";

const linkedinSchema = () =>
  z
    .url()
    .regex(
      /^https?:\/\/(www\.)?linkedin\.com\/(in|company|school)\/[A-Za-z0-9-_%]+\/?$/,
      { message: "Invalid LinkedIn URL" }
    );

export default linkedinSchema;

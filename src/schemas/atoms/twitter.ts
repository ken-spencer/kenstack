import * as z from "zod";

const twitterSchema = () =>
  z
    .url()
    .regex(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/?$/, {
      message: "Invalid Twitter/X URL",
    });

export default twitterSchema;

import * as z from "zod";

const tagSchema = () =>
  z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
    })
  );

export default tagSchema;

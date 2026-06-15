import * as z from "zod";

export const resetPasswordPageRouteOptions = {
  search: z.object({
    token: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((value) => (Array.isArray(value) ? value[0] : value)),
  }),
};

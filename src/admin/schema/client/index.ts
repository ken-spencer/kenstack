// import * as z from "zod";
// type ObjectId = {
//   toHexString: () => string;
// };

// export const buildIdSchema = (
//   buildSchema: (base: z.ZodString) => z.ZodType<string> = (base) => base
// ): z.ZodType<string> =>
//   z.preprocess((val) => {
//     if (
//       val &&
//       typeof val === "object" &&
//       typeof (val as ObjectId).toHexString === "function"
//     ) {
//       return (val as ObjectId).toHexString();
//     }
//     return val;
//   }, buildSchema(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")));

// export const buildDateSchema = (
//   buildSchema: (base: z.ZodString) => z.ZodType<string> = (base) => base
// ): z.ZodType<string> =>
//   z.preprocess((val) => {
//     if (val instanceof Date) {
//       return val.toISOString();
//     }
//     return val;
//   }, buildSchema(z.string().refine((s) => !isNaN(Date.parse(s)), { message: "Invalid date" })));

// export const adminSchema = z.object({
//   _id: buildIdSchema((s) => s.optional()),
//   meta: z
//     .object({
//       createdAt: buildDateSchema(),
//       updatedAt: buildDateSchema(),
//       deleted: z.boolean(),
//       createdBy: buildIdSchema((s) => s.nullable().optional()),
//     })
//     .optional(),
// });

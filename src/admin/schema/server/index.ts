// import * as z from "zod";

// import { ObjectId } from "mongodb";

// export const buildIdSchema = (
//   buildSchema: (base: z.ZodType<ObjectId>) => z.ZodType<ObjectId> = (base) =>
//     base
// ): z.ZodType<ObjectId> =>
//   z.preprocess((val) => {
//     if (typeof val === "string" && ObjectId.isValid(val)) {
//       return new ObjectId(val);
//     }
//     return val;
//   }, buildSchema(z.instanceof(ObjectId)));

// export const buildDateSchema = (
//   buildSchema: (base: z.ZodDate) => z.ZodType<Date> = (base) => base
// ): z.ZodType<Date> =>
//   z.preprocess((val) => {
//     if (val === "") return undefined;
//     if (typeof val === "string" && val.length) return new Date(val);
//     return val;
//   }, buildSchema(z.date()));

// // export const handleDate = (dateChain?: z.ZodDate): z.ZodType<Date> =>
// //   z.preprocess((val) => {
// //     if (val === "") {
// //       return undefined;
// //     }

// //     if (typeof val === "string" && val.length) {
// //       return new Date(val);
// //     }
// //     return val;
// //   }, dateChain ?? z.date());

// export const adminSchema = z.object({
//   _id: buildIdSchema((s) => s.optional()),
//   isNew: z.boolean().optional(),
//   // meta: z.object({
//   //   createdAt: date(),
//   //   updatedAt: date(),
//   //   deleted: z.boolean().default(false),
//   //   createdBy: id().optional(),
//   // }),
// });

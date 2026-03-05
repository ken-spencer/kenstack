import * as z from "zod";

// // type AnyRecord = Record<string, unknown>;

// export type PipelineSchema =
//   | z.ZodObject
//   | z.ZodPipe<z.ZodObject>
//   | z.ZodUnion<readonly z.ZodObject[]>;

export type SchemaModes = "client" | "server";
export type SchemaFactory = <T extends SchemaModes>(mode: T) => z.ZodObject;

// export interface SchemaFactory<T extends z.ZodRawShape> {
//   <Mode extends SchemaModes>(mode: Mode): z.ZodObject<T>;
// }

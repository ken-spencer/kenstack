export { default as pipeline } from "./pipeline";
export { default as recaptcha } from "./recaptcha";
export { default as authenticate } from "./authenticate";
export { default as create } from "./create";
export { default as update } from "./update";

import type { ObjectId } from "mongodb";

import type { NextRequest } from "next/server";
import { PipelineResponse } from "./PipelineResponse";

import { z } from "zod";
import { type PipelineSchema } from "@kenstack/schemas";
export type DefaultSchema = z.ZodObject;

// const defaultSchema = z.object({}).catchall(z.unknown()); // => Record<string, unknown>
// export type DefaultSchema = typeof defaultSchema;

import { type AuthenticatedUser } from "@kenstack/lib/auth";

export type PipelineContext<TSchema extends PipelineSchema = z.ZodObject> = {
  request: NextRequest;
  response: PipelineResponse;
  // params: Record<string, unknown>; // narrow to string|string[] if desired
  /** unsafe data */
  dataIn?: Record<string, unknown>;
  data?: z.output<TSchema>;
  id: ObjectId | null;
  schema?: PipelineSchema | null;
  // insertedId?: ObjectId;
  user?: AuthenticatedUser;
  session?: never;
  model?: never;
};

export type ActionResult<Schema extends PipelineSchema> =
  | Partial<PipelineContext<Schema>>
  | PipelineResponse
  | void;

export type PipelineAction<S extends PipelineSchema = DefaultSchema> = <
  Ctx extends PipelineContext<S> = PipelineContext<S>,
>(
  ctx: Ctx
) =>
  | void
  | Partial<Ctx>
  | Partial<PipelineContext>
  | PipelineResponse
  | Promise<void | Partial<Ctx> | Partial<PipelineContext> | PipelineResponse>;

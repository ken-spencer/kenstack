export { default as pipeline, type PipelineOptions } from "./pipeline";
export { default as multiPipeline } from "./multiPipeline";
export { default as recaptcha } from "./recaptcha";
export { default as authenticate } from "./authenticate";
// export { default as create } from "./create";
// export { default as update } from "./update";
// export { default as saveErrorResponse } from "./saveErrorResponse";

import type { NextRequest } from "next/server";
import { PipelineResponse } from "./PipelineResponse";

import { z } from "zod";
export type DefaultSchema = z.ZodObject;

// const defaultSchema = z.object({}).catchall(z.unknown()); // => Record<string, unknown>
// export type DefaultSchema = typeof defaultSchema;

import { type User } from "@kenstack/types";

export type PipelineContext<TSchema extends z.ZodType> = {
  request: NextRequest;
  response: PipelineResponse;
  /** unsafe data */
  dataIn?: unknown;
  schema?: TSchema;
  data: z.output<TSchema>;
  id?: number;
  // insertedId?: ObjectId;
  user?: User;
  session?: never;
  model?: never;
};

export type ActionResult<TSchema extends z.ZodType> =
  | Partial<PipelineContext<TSchema>>
  | PipelineResponse
  | void;

export type PipelineAction<TSchema extends z.ZodType = z.ZodObject> = <
  Ctx extends PipelineContext<TSchema> = PipelineContext<TSchema>,
>(
  ctx: Ctx
) =>
  | void
  | Partial<Ctx>
  | Partial<PipelineContext<TSchema>>
  | PipelineResponse
  | Promise<
      void | Partial<Ctx> | Partial<PipelineContext<TSchema>> | PipelineResponse
    >;

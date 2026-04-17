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

import { type User } from "@kenstack/types";

export type ObjectSchema = z.Schema<Record<string, unknown>>;

export type PipelineContext<TSchema extends ObjectSchema | undefined> = {
  request: NextRequest;
  response: PipelineResponse;
  /** unsafe data */
  dataIn?: unknown;
  schema: TSchema;
  data: TSchema extends ObjectSchema ? z.output<TSchema> : undefined;
  id?: number;
  user?: User;
  session?: never;
  // model?: never;
};

export type ActionResult<TSchema extends ObjectSchema> =
  | Partial<PipelineContext<TSchema>>
  | PipelineResponse
  | void;

export type PipelineAction<
  TSchema extends ObjectSchema | undefined = z.ZodObject,
> = <Ctx extends PipelineContext<TSchema> = PipelineContext<TSchema>>(
  ctx: Ctx,
) =>
  | void
  | Partial<Ctx>
  | Partial<PipelineContext<TSchema>>
  | PipelineResponse
  | Promise<
      void | Partial<Ctx> | Partial<PipelineContext<TSchema>> | PipelineResponse
    >;

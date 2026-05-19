export {
  default as pipeline,
  pipelineStage,
  type PipelineOptions,
} from "./pipeline";
export { default as multiPipeline } from "./multiPipeline";
export { default as recaptcha } from "./recaptcha";
export { UserFacingError } from "./errors";

// import type { NextRequest } from "next/server";
// import { PipelineResponse } from "./PipelineResponse";

import { z } from "zod";

// import { type User } from "@kenstack/types";

export type ObjectSchema = z.Schema<Record<string, unknown>>;

// export type PipelineContext<TSchema extends ObjectSchema | undefined> = {
//   request: NextRequest;
//   response: PipelineResponse;
//   /** unsafe data */
//   dataIn?: unknown;
//   // schema: TSchema;
//   data: TSchema extends ObjectSchema ? z.output<TSchema> : undefined;
//   user?: User;
//   id?: number;
// };

// export type ActionResult<TSchema extends ObjectSchema> =
//   | Partial<PipelineContext<TSchema>>
//   | PipelineResponse
//   | void;

// export type PipelineAction<
//   TSchema extends ObjectSchema | undefined = z.ZodObject,
// > = <Ctx extends PipelineContext<TSchema> = PipelineContext<TSchema>>(
//   ctx: Ctx,
// ) =>
//   | void
//   | Partial<Ctx>
//   | Partial<PipelineContext<TSchema>>
//   | PipelineResponse
//   | Promise<
//       void | Partial<Ctx> | Partial<PipelineContext<TSchema>> | PipelineResponse
//     >;

import errorLog from "@kenstack/lib/errorLog";
import { NextRequest, NextResponse } from "next/server";
import type { PipelineAction, PipelineContext } from ".";
import { type PipelineSchema } from "@kenstack/schemas";

import { type FetchError } from "@kenstack/lib/fetcher";

import { z } from "zod";
// type Merge<A, B> = Omit<A, keyof B> & B;

import isPlainObject from "lodash-es/isPlainObject";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { PipelineResponse } from "./PipelineResponse";

import { objectId } from "@kenstack/schemas/atoms";
const idSchema = objectId("server").default(null);

import { type SchemaFactory } from "@kenstack/schemas";
export default async function pipeline<
  TSchema extends PipelineSchema = z.ZodObject,
>(
  request: NextRequest,
  schemaOrFactory: TSchema | SchemaFactory = null,
  actions: PipelineAction<TSchema>[] = [],
  options: Record<string, unknown> = {}
) {
  /** Build schema from factory function when needed */
  const schema =
    typeof schemaOrFactory === "function"
      ? schemaOrFactory("server")
      : schemaOrFactory;

  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("application/json")) {
    return NextResponse.json({
      status: "error",
      message: "Invalid request. Only JSON is accepted.",
    } satisfies FetchError);
  }
  const { id, ...json } = await request.json();

  let parsedId = null;
  const idCheck = idSchema.safeParse(id);
  if (idCheck.success) {
    parsedId = idCheck.data;
  }

  let parsed;
  if (schema) {
    parsed = await schema.safeParseAsync(json);
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);

      return NextResponse.json({
        status: "error",
        message: "Please review the() form and correct the highlighted fields.",
        fieldErrors,
      } satisfies FetchError);
    }
  }
  const response = new PipelineResponse();
  let context: PipelineContext<TSchema> = {
    ...options,
    id: parsedId,
    request,
    response,
    schema,
    dataIn: json,
    data: schema ? parsed.data : null, // as z.output<typeof schema>,
  };

  for (const [key, action] of actions.entries()) {
    let result;
    try {
      result = await action(context);
    } catch (e) {
      if (isRedirectError(e)) {
        throw e;
      }

      errorLog(e, `Fatal Error on apiPipleine key ${key}`);
      return NextResponse.json({
        status: "error",
        message:
          "There was an unexpected problem processing your request. Please try again later.",
      } satisfies FetchError);
    }

    if (response.stopped) {
      return response.toNextResponse();
    }

    if (result === response) {
      continue;
    }

    if (isPlainObject(result)) {
      context = { ...context, ...result };
    }
  }

  return response.toNextResponse();
}

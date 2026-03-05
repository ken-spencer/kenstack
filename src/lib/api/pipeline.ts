import errorLog from "@kenstack/lib/errorLog";
import { NextRequest, NextResponse } from "next/server";
import type { PipelineAction, PipelineContext } from ".";

import { type FetchError } from "@kenstack/lib/fetcher";

import * as z from "zod";

import isPlainObject from "lodash-es/isPlainObject";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { PipelineResponse } from "./PipelineResponse";

// import { objectId } from "@kenstack/schemas/atoms";
// const idSchema = objectId("server").default(null);

export type PipelineOptions<TSchema extends z.ZodType> = {
  request: NextRequest;
  schema?: TSchema;
  json?: Record<string, unknown>;
} & Record<string, unknown>;

export default async function pipeline<TSchema extends z.ZodType>(
  options: PipelineOptions<TSchema>,
  actions: PipelineAction<TSchema>[] = []
) {
  const { request, schema, ...localOptions } = options;
  /** Build schema from factory function when needed */
  // const schema =
  //   schemaOrFactory && typeof schemaOrFactory === "function"
  //     ? schemaOrFactory("server")
  //     : schemaOrFactory;

  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("application/json")) {
    return NextResponse.json({
      status: "error",
      message: "Invalid request. Only JSON is accepted.",
    } satisfies FetchError);
  }
  const { id, ...json } = localOptions?.json ?? (await request.json());

  let parsedId;
  const idCheck = z.number().optional().safeParse(id);
  if (idCheck.success) {
    parsedId = idCheck.data;
  }

  let data;
  if (schema) {
    const parsed = await schema.safeParseAsync(json);
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);

      return NextResponse.json({
        status: "error",
        message: "Please review the() form and correct the highlighted fields.",
        fieldErrors: fieldErrors as Record<string, string[]>,
      } satisfies FetchError);
    }
    data = parsed.data; // as Record<string, unknown>;
  }

  if (!data) {
    throw Error("data is missing");
  }

  const response = new PipelineResponse();
  let context: PipelineContext<TSchema> = {
    ...localOptions,
    id: parsedId,
    request,
    response,
    schema,
    dataIn: json,
    data,
  };

  for (const [key, action] of actions.entries()) {
    let result;
    try {
      result = await action(context);
    } catch (e) {
      if (isRedirectError(e)) {
        throw e;
      }

      if (e instanceof Error) {
        errorLog(e, `Fatal Error on apiPipleine key ${key}`);
      } else {
        // eslint-disable-next-line no-console
        console.error("Unknown error", e);
      }
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

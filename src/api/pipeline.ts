import errorLog from "@kenstack/lib/errorLog";
import { NextRequest, NextResponse } from "next/server";
import type { ObjectSchema } from ".";

import { type FetchError } from "@kenstack/api/fetcher";

import * as z from "zod";

import isPlainObject from "lodash-es/isPlainObject";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { PipelineResponse } from "./PipelineResponse";
import { deps } from "@app/deps";
import type { User } from "@kenstack/types";

// import { objectId } from "@kenstack/schemas/atoms";
// const idSchema = objectId("server").default(null);

export type PipelineOptions = {
  request: NextRequest;
  json?: Record<string, unknown>;
}; //& Record<string, unknown>;

type Roles = typeof deps.roles;
type UserRole = Roles[number] | readonly Roles[number][];

type PipelineContext = {
  request: NextRequest;
  response: PipelineResponse;
  /** unsafe data */
  dataIn: unknown;
} & Record<string, unknown>;

export type PipelineStageContext<
  TSchema extends ObjectSchema | undefined = undefined,
  TRole = undefined,
> = PipelineContext & {
  data: TSchema extends ObjectSchema ? z.output<TSchema> : undefined;
  user: [TRole] extends [undefined] ? User | undefined : User;
};

type PipelineStageResult =
  | void
  | PipelineResponse
  | (Record<string, unknown> & {
      request?: never;
      response?: never;
      dataIn?: never;
      data?: never;
      user?: never;
    });

type PipelineStage = (
  ctx: PipelineContext,
) => Promise<PipelineStageResult> | PipelineStageResult;

type PipelineStageCallback<
  TSchema extends ObjectSchema | undefined,
  TRole = undefined,
> = (
  arg: PipelineStageContext<TSchema, TRole>,
) => Promise<PipelineStageResult> | PipelineStageResult;

export default async function pipeline(
  options: PipelineOptions,
  actions: PipelineStage[] = [],
) {
  const { request, ...localOptions } = options;

  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("application/json")) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid request. Only JSON is accepted.",
      } satisfies FetchError,
      { status: 400 },
    );
  }

  let json;
  try {
    json = localOptions?.json ?? (await request.json());
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid request. There was a problem parsing the JSON.",
      } satisfies FetchError,
      { status: 400 },
    );
  }

  const response = new PipelineResponse();
  let context = {
    ...localOptions,
    request,
    response,
    dataIn: json,
  } satisfies PipelineContext;

  for (const [key, action] of actions.entries()) {
    let result;
    try {
      result = await action(context);
    } catch (e) {
      if (isRedirectError(e)) {
        throw e;
      }

      if (e instanceof Error) {
        errorLog(e, `Fatal error on pipeline key ${key}`);
      } else {
        // eslint-disable-next-line no-console
        console.error("Unknown error", e);
      }
      return NextResponse.json(
        {
          status: "error",
          message:
            "There was an unexpected problem processing your request. Please try again later.",
        } satisfies FetchError,
        { status: 500 },
      );
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

export const pipelineStage =
  <
    TSchema extends ObjectSchema | undefined = undefined,
    const TRole extends UserRole | undefined = undefined,
  >(
    { schema, role }: { schema?: TSchema; role?: TRole },
    action: PipelineStageCallback<TSchema, TRole>,
  ) =>
  async (ctx: PipelineContext) => {
    let data: PipelineStageContext<TSchema, TRole>["data"];

    if (schema) {
      const parsed = await schema.safeParseAsync(ctx.dataIn);
      if (!parsed.success) {
        const { fieldErrors } = z.flattenError(parsed.error);

        return ctx.response.error({
          message: "Please review the form and correct the highlighted fields.",
          fieldErrors: fieldErrors as Record<string, string[]>,
        });
      }

      data = parsed.data as PipelineStageContext<TSchema, TRole>["data"];
    } else {
      data = undefined as PipelineStageContext<TSchema, TRole>["data"];
    }

    const user = role ? await deps.auth.requireUser(role) : undefined;

    const arg = {
      ...ctx,
      user: user as PipelineStageContext<TSchema, TRole>["user"],
      data,
    } satisfies PipelineStageContext<TSchema, TRole>;

    return action(arg);
  };

import errorLog from "@kenstack/lib/errorLog";
import { UserFacingError } from "./errors";
import { NextRequest, NextResponse } from "next/server";
import type { ObjectSchema } from ".";

import { type FetchError } from "@kenstack/api/fetcher";

import * as z from "zod";

import isPlainObject from "lodash-es/isPlainObject";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { PipelineResponse } from "./PipelineResponse";
import { deps } from "@app/deps";
import type { UserAccess } from "@kenstack/auth/types";
import type { User } from "@kenstack/types";

export type PipelineOptions = {
  request: NextRequest;
  json?: Record<string, unknown>;
};

type PipelineContext = {
  request: NextRequest;
  response: PipelineResponse;
  /** unsafe data */
  dataIn: unknown;
} & Record<string, unknown>;

export type PipelineStageContext<
  TSchema extends ObjectSchema | undefined = undefined,
  TAccess = undefined,
> = PipelineContext & {
  data: TSchema extends ObjectSchema ? z.output<TSchema> : undefined;
  user: [TAccess] extends [undefined] ? User | undefined : User;
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
  TAccess = undefined,
> = (
  arg: PipelineStageContext<TSchema, TAccess>,
) => Promise<PipelineStageResult> | PipelineStageResult;

type PipelineStageOptions<TSchema extends ObjectSchema | undefined, TAccess> = {
  schema?: TSchema;
  access?: TAccess;
  fieldsKey?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

export default async function pipeline(
  options: PipelineOptions,
  actions: PipelineStage | PipelineStage[] = [],
) {
  const { request, ...localOptions } = options;
  const pipelineActions = Array.isArray(actions) ? actions : [actions];

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

  for (const [key, action] of pipelineActions.entries()) {
    let result;
    try {
      result = await action(context);
    } catch (e) {
      if (isRedirectError(e)) {
        throw e;
      }

      if (e instanceof UserFacingError) {
        return response
          .error({
            message: e.message,
            status: e.status,
          })
          .toNextResponse();
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
    const TAccess extends UserAccess | undefined = undefined,
  >(
    { schema, access, fieldsKey }: PipelineStageOptions<TSchema, TAccess>,
    action: PipelineStageCallback<TSchema, TAccess>,
  ) =>
  async (ctx: PipelineContext) => {
    let data: PipelineStageContext<TSchema, TAccess>["data"];

    if (schema) {
      if (fieldsKey) {
        if (!(schema instanceof z.ZodObject)) {
          throw new Error("pipelineStage fieldsKey requires an object schema");
        }

        const { [fieldsKey]: valuesSchema, ...metaShape } = schema.shape;

        if (!valuesSchema) {
          throw new Error(
            `pipelineStage fieldsKey "${fieldsKey}" is not in the schema`,
          );
        }

        const metaSchema = z.object(metaShape);
        const parsedMeta = await metaSchema.safeParseAsync(ctx.dataIn);
        if (!parsedMeta.success) {
          // eslint-disable-next-line no-console
          console.error("Invalid form metadata", parsedMeta.error);

          return ctx.response.error(
            "There was an unexpected problem with your submission. The metadata received was invalid.",
          );
        }

        const valuesInput = isRecord(ctx.dataIn)
          ? ctx.dataIn[fieldsKey]
          : undefined;
        const parsedValues = await valuesSchema.safeParseAsync(valuesInput);
        if (!parsedValues.success) {
          const { fieldErrors } = z.flattenError(parsedValues.error);

          return ctx.response.error({
            message:
              "Please review the form and correct the highlighted fields.",
            fieldErrors: fieldErrors as Record<string, string[]>,
          });
        }

        data = {
          ...parsedMeta.data,
          [fieldsKey]: parsedValues.data,
        } as PipelineStageContext<TSchema, TAccess>["data"];
      } else {
        const parsed = await schema.safeParseAsync(ctx.dataIn);
        if (!parsed.success) {
          const { fieldErrors } = z.flattenError(parsed.error);

          return ctx.response.error({
            message:
              "Please review the form and correct the highlighted fields.",
            fieldErrors: fieldErrors as Record<string, string[]>,
          });
        }

        data = parsed.data as PipelineStageContext<TSchema, TAccess>["data"];
      }
    } else {
      data = undefined as PipelineStageContext<TSchema, TAccess>["data"];
    }

    let user: User | undefined;
    if (access !== undefined) {
      if (!(await deps.auth.hasAccess(access))) {
        if (!(await deps.auth.isAuthenticated())) {
          return ctx.response.error({
            message: "You must be signed in to perform this action.",
            status: 401,
          });
        }

        return ctx.response.error({
          message: "You do not have permission to perform this action.",
          status: 403,
        });
      }

      user = await deps.auth.requireUser();
    }

    const arg = {
      ...ctx,
      user: user as PipelineStageContext<TSchema, TAccess>["user"],
      data,
    } satisfies PipelineStageContext<TSchema, TAccess>;

    return action(arg);
  };

import { ReturnedError } from "./errors";
import { NextRequest, NextResponse } from "next/server";
import { claimQuota } from "./quota";
import recaptcha from "./recaptcha";
import type { ObjectSchema } from ".";

import { type FetchError } from "@kenstack/api/fetcher";

import * as z from "zod";

import isPlainObject from "lodash-es/isPlainObject";

import { unstable_rethrow } from "next/navigation";
import { PipelineResponse } from "./PipelineResponse";
import { resolveAccess } from "@kenstack/api/access";
import { verificationMissingMessage } from "@kenstack/auth/email/verification/internal/policy";
import { accountChangedRefusal } from "@kenstack/auth/renderedAccount";
import { loadAuthState, loadUserInfo } from "@kenstack/auth/server/state";
import { reportError } from "@kenstack/lib/errorReporter";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import type { User } from "@kenstack/types";
import { isRecord } from "@kenstack/lib/isRecord";
import getIp from "@kenstack/lib/ip";

type ValidationErrorTree = {
  errors: string[];
  items?: (ValidationErrorTree | undefined)[];
  properties?: Record<string, ValidationErrorTree | undefined>;
};

function validationErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  const tree = z.treeifyError(error) as ValidationErrorTree;

  const visit = (node: ValidationErrorTree, path: string[]) => {
    if (node.errors.length) {
      if (path.length) {
        fieldErrors[path.join(".")] ??= [];
        fieldErrors[path.join(".")].push(...node.errors);
      } else {
        formErrors.push(...node.errors);
      }
    }

    Object.entries(node.properties ?? {}).forEach(([name, child]) => {
      if (child) {
        visit(child, [...path, name]);
      }
    });
    node.items?.forEach((child, index) => {
      if (child) {
        visit(child, [...path, String(index)]);
      }
    });
  };

  visit(tree, []);

  return {
    ...(Object.keys(fieldErrors).length ? { fieldErrors } : {}),
    ...(formErrors.length ? { formErrors } : {}),
  };
}

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
  // The proven email a stage with access "proven" acts for.
  proof: [TAccess] extends ["proven"] ? { email: string } : undefined;
  user: [TAccess] extends [undefined | "proven"] ? User | undefined : User;
};

type PipelineStageResult =
  | void
  | PipelineResponse
  | (Record<string, unknown> & {
      request?: never;
      response?: never;
      dataIn?: never;
      data?: never;
      proof?: never;
      user?: never;
    });

export type PipelineStage = (
  ctx: PipelineContext,
) => Promise<PipelineStageResult> | PipelineStageResult;

// Marks what pipelineStage returns, so multiPipeline can tell a stage from an
// action that runs its own pipeline. The key holds the stage itself because
// multiPipeline types a stage by this key alone: a second call signature in
// its action union would leave untyped action parameters as implicit any.
export const isStage = Symbol("pipelineStage");

type PipelineStageCallback<TContext extends PipelineContext> = (
  arg: TContext,
) => Promise<PipelineStageResult> | PipelineStageResult;

type PipelineStageOptions<TSchema extends ObjectSchema | undefined, TAccess> = {
  schema?: TSchema;
  access?: TAccess;
  fieldsKey?: string;
  // Per-IP quota scope, claimed before reCAPTCHA and the action.
  quota?: string;
  // reCAPTCHA action, verified against the token in the request body.
  recaptcha?: string;
};

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
      unstable_rethrow(e);

      if (e instanceof ReturnedError) {
        return response
          .error({
            code: e.code,
            details: e.details,
            message: e.message,
            status: e.status,
            redirect: e.redirect,
          })
          .toNextResponse();
      }

      await reportError(e, {
        source: "api.pipeline",
        context: { stage: key },
        request,
      });
      return NextResponse.json(
        {
          status: "error",
          message:
            "There was an unexpected problem processing your request. Please try again later.",
          ...(process.env.NODE_ENV === "development" && e instanceof Error
            ? {
                debugMessage: e.message,
                debugStack: e.stack,
              }
            : {}),
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

  if (response.returnUser) {
    // Read after every stage, so it reflects all of this request's changes to the user or session.
    response.headers.set("Cache-Control", "no-store");
    return response.toNextResponse(await loadUserInfo());
  }
  return response.toNextResponse();
}

export function pipelineStage<
  TSchema extends ObjectSchema | undefined = undefined,
  const TAccess extends AuthAccess | "proven" | undefined = undefined,
>(
  {
    schema,
    access,
    fieldsKey,
    quota,
    recaptcha: recaptchaAction,
  }: PipelineStageOptions<TSchema, TAccess>,
  action: PipelineStageCallback<PipelineStageContext<TSchema, TAccess>>,
): PipelineStage & { [isStage]: PipelineStage } {
  const stage = async (ctx: PipelineContext) => {
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
          // eslint-disable-next-line no-console -- Invalid submitted data is not an operational alert.
          console.error("Invalid form metadata", parsedMeta.error);

          return ctx.response.error(
            "There was an unexpected problem with your submission.",
          );
        }

        const valuesInput = isRecord(ctx.dataIn)
          ? ctx.dataIn[fieldsKey]
          : undefined;
        const parsedValues = await valuesSchema.safeParseAsync(valuesInput);
        if (!parsedValues.success) {
          return ctx.response.error({
            message:
              "Please review the form and correct the highlighted fields.",
            ...validationErrors(parsedValues.error),
          });
        }

        data = {
          ...parsedMeta.data,
          [fieldsKey]: parsedValues.data,
        } as PipelineStageContext<TSchema, TAccess>["data"];
      } else {
        const parsed = await schema.safeParseAsync(ctx.dataIn);
        if (!parsed.success) {
          return ctx.response.error({
            message:
              "Please review the form and correct the highlighted fields.",
            ...validationErrors(parsed.error),
          });
        }

        data = parsed.data as PipelineStageContext<TSchema, TAccess>["data"];
      }
    } else {
      data = undefined as PipelineStageContext<TSchema, TAccess>["data"];
    }

    let proof: { email: string } | undefined;
    let user: User | undefined;
    if (access === "proven") {
      // Acts for a proven email. A session that appeared since the page rendered may be another
      // account's, so any session is refused as a changed sign-in. One read decides both.
      const authState = await loadAuthState();
      if (authState.state !== "proven") {
        return ctx.response.error(
          authState.state === "authenticated"
            ? { ...accountChangedRefusal, status: 409 }
            : { message: verificationMissingMessage, status: 401 },
        );
      }
      proof = { email: authState.email };
    } else if (access !== undefined) {
      const resolved = await resolveAccess(ctx.request, access);
      if (resolved.refusal) {
        return ctx.response.error(resolved.refusal);
      }
      user = resolved.user;
    }

    // Quota first: cheaper than the reCAPTCHA assessment and the action.
    if (quota) {
      const exceeded = await claimQuota(quota, {
        ip: await getIp(ctx.request),
      });
      if (exceeded) {
        throw new ReturnedError(exceeded.message, { status: 429 });
      }
    }

    if (recaptchaAction) {
      const rejection = await recaptcha({
        action: recaptchaAction,
        body: ctx.dataIn,
        request: ctx.request,
        response: ctx.response,
      });
      if (rejection) {
        return rejection;
      }
    }

    const arg = {
      ...ctx,
      proof: proof as PipelineStageContext<TSchema, TAccess>["proof"],
      user: user as PipelineStageContext<TSchema, TAccess>["user"],
      data,
    } satisfies PipelineStageContext<TSchema, TAccess>;

    return action(arg);
  };

  return Object.assign(stage, { [isStage]: stage });
}

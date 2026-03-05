import { NextRequest, NextResponse } from "next/server";
import { type FetchError } from "../fetcher";
// import { type PipelineAction } from ".";
import { pipeline, type PipelineOptions } from ".";
import isPlainObject from "lodash-es/isPlainObject";

type Options = {
  request: NextRequest;
} & Record<string, unknown>;

type Actions = [
  string,
  (options: PipelineOptions) => ReturnType<typeof pipeline>,
][];

export default async function multiPipeline(
  options: Options,
  actions: Actions
) {
  const { request } = options;
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("application/json")) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid request. Only JSON is accepted.",
      } satisfies FetchError,
      { status: 415 }
    );
  }

  const rawJson = await request.json();
  if (!isPlainObject(rawJson)) {
    return NextResponse.json(
      {
        status: "error",
        message: `Invalid JSON a plain object is expected`,
      } satisfies FetchError,
      { status: 400 }
    );
  }

  const { _action: actionName, ...json } = rawJson;

  if (typeof actionName !== "string" || actionName.length === 0) {
    return NextResponse.json(
      {
        status: "error",
        message: `Invalid request; action is required`,
      } satisfies FetchError,
      { status: 400 }
    );
  }

  const actionTuple = actions.find(([key]) => actionName === key);

  if (!actionTuple) {
    return NextResponse.json(
      {
        status: "error",
        message: `Invalid action ${actionName}`,
      } satisfies FetchError,
      { status: 400 }
    );
  }

  const [, actionItem] = actionTuple;
  return await actionItem({ ...options, json });
}

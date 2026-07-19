import { NextResponse } from "next/server";
import { type FetchError } from "./fetcher";
import { pipeline, type PipelineOptions } from ".";
import isPlainObject from "lodash-es/isPlainObject";

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

export default async function multiPipeline(
  options: PipelineOptions & Record<string, unknown>,
  actions: Record<
    string,
    (options: PipelineOptions) => ReturnType<typeof pipeline>
  >,
) {
  const { request } = options;
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("application/json")) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid request. Only JSON is accepted.",
      } satisfies FetchError,
      { status: 415 },
    );
  }

  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid request. There was a problem parsing the JSON.",
      } satisfies FetchError,
      { status: 400 },
    );
  }

  if (!isRecord(rawJson)) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid JSON. A plain object is expected.",
      } satisfies FetchError,
      { status: 400 },
    );
  }

  const { action: actionName, ...json } = rawJson;

  if (typeof actionName !== "string" || actionName.length === 0) {
    return NextResponse.json(
      {
        status: "error",
        message: `Invalid request; action is required`,
      } satisfies FetchError,
      { status: 400 },
    );
  }

  const actionItem = Object.hasOwn(actions, actionName)
    ? actions[actionName]
    : undefined;

  if (!actionItem) {
    return NextResponse.json(
      {
        status: "error",
        message: `Invalid action ${actionName}`,
      } satisfies FetchError,
      { status: 400 },
    );
  }

  return await actionItem({ ...options, json });
}

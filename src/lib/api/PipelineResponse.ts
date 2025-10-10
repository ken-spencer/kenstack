import { NextResponse } from "next/server";

// declare const PIPELINE_BRAND: unique symbol;
const PIPELINE_BRAND = Symbol("PipelineResponseBrand");

export interface PipelineResponseShape {
  /** this unique symbol makes it nominal */
  readonly [PIPELINE_BRAND]: true;

  readonly headers: NextResponse["headers"];
  readonly cookies: NextResponse["cookies"];
  status(code: number): this;
  json(obj: Record<string, unknown>): this;
  final(obj: Record<string, unknown>): this;
  error(message: string): this;
  toNextResponse(): NextResponse;
}

export class PipelineResponse implements PipelineResponseShape {
  public readonly [PIPELINE_BRAND] = true;
  private _payload: Record<string, unknown> = {};
  private _stopped = false;
  private _status = 200;

  // Grab real headers & cookies stores from a throwaway NextResponse
  // public readonly headers: NextResponse["headers"];
  // public readonly cookies: NextResponse["cookies"];

  public readonly headers: NextResponse["headers"] = new NextResponse(null, {
    status: 200,
  }).headers;

  public readonly cookies: NextResponse["cookies"] = new NextResponse(null, {
    status: 200,
  }).cookies;

  constructor() {
    // const tmp = new NextResponse(null, { status: 200 });
    // this.headers = tmp.headers;
    // this.cookies = tmp.cookies;
  }

  get stopped() {
    return this._stopped;
  }

  status(code: number) {
    this._status = code;
    return this;
  }

  json(obj: Record<string, unknown>) {
    this._payload = obj;
    return this;
  }

  final(obj: { success?: never; error?: never } & Record<string, unknown>) {
    this.json(obj);
    this._stopped = true;
    return this;
  }

  redirectToLogin() {
    return this.final({ redirect: "/login" });
  }

  success<TPayload extends Record<string, unknown> = Record<string, unknown>>({
    message,
    ...payload
  }: { message?: string } & TPayload) {
    return this.json({
      status: "success", // thinking of switching to this syntax.
      message,
      ...payload,
    });
  }
  error(
    message: string,
    payload: { fieldErrors?: Record<string, string | string[]> } = {}
  ) {
    return this.final({ status: "error", message, ...payload });
  }

  toNextResponse() {
    const res = NextResponse.json(this._payload, { status: this._status });
    for (const [key, value] of this.headers.entries()) {
      res.headers.set(key, value);
    }
    for (const cookie of this.cookies.getAll()) {
      res.cookies.set(cookie);
    }
    return res;
  }
}
